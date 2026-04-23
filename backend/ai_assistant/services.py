"""
AI Assistant service layer.

Handles:
1. Building user-specific context from database records (RAG-lite)
2. System prompt engineering with role-aware instructions
3. Calling the LLM API with conversation memory
4. Built-in fallback AI when no API key is configured
"""

import re
from django.conf import settings
from django.utils import timezone
from django.db.models import Sum, Count, Q

from cases.models import Case, CaseNote
from appointments.models import Appointment
from billing.models import Invoice, TimeEntry


def build_user_context(user):
    """
    Query the database for records relevant to this user and their role.
    This is injected into the system prompt so the LLM can answer
    questions grounded in real data.
    """
    sections = []
    now = timezone.now()

    if user.role == 'client':
        # --- Client sees their own cases ---
        cases = Case.objects.filter(client=user).select_related('lawyer')
        if cases.exists():
            case_lines = []
            for c in cases[:10]:
                lawyer_name = c.lawyer.full_name if c.lawyer else 'Unassigned'
                case_lines.append(
                    f"  - {c.case_number}: \"{c.title}\" | status={c.status} | "
                    f"priority={c.priority} | lawyer={lawyer_name} | "
                    f"category={c.category or 'N/A'}"
                )
            sections.append("YOUR CASES:\n" + "\n".join(case_lines))

        # Upcoming appointments
        appointments = Appointment.objects.filter(
            case__client=user,
            datetime__gte=now,
            status__in=['scheduled', 'confirmed']
        ).select_related('case')[:5]
        if appointments:
            apt_lines = [
                f"  - {a.case.case_number} | {a.appointment_type} | "
                f"{a.datetime.strftime('%Y-%m-%d %H:%M')} | status={a.status}"
                for a in appointments
            ]
            sections.append("YOUR UPCOMING APPOINTMENTS:\n" + "\n".join(apt_lines))

        # Outstanding invoices
        invoices = Invoice.objects.filter(
            case__client=user,
            status__in=['sent', 'overdue']
        ).select_related('case')[:5]
        if invoices:
            inv_lines = [
                f"  - {inv.invoice_number} | case={inv.case.case_number} | "
                f"amount=${inv.total_amount} | status={inv.status} | "
                f"due={inv.due_date or 'N/A'}"
                for inv in invoices
            ]
            sections.append("YOUR INVOICES (UNPAID):\n" + "\n".join(inv_lines))

    elif user.role == 'lawyer':
        # --- Lawyer sees assigned cases ---
        cases = Case.objects.filter(lawyer=user).select_related('client')
        if cases.exists():
            case_lines = []
            for c in cases[:15]:
                client_name = c.client.full_name if c.client else 'Unknown'
                case_lines.append(
                    f"  - {c.case_number}: \"{c.title}\" | status={c.status} | "
                    f"priority={c.priority} | client={client_name} | "
                    f"category={c.category or 'N/A'}"
                )
            sections.append("YOUR ASSIGNED CASES:\n" + "\n".join(case_lines))

        # Upcoming appointments
        appointments = Appointment.objects.filter(
            case__lawyer=user,
            datetime__gte=now,
            status__in=['scheduled', 'confirmed']
        ).select_related('case')[:5]
        if appointments:
            apt_lines = [
                f"  - {a.case.case_number} | {a.appointment_type} | "
                f"{a.datetime.strftime('%Y-%m-%d %H:%M')} | status={a.status}"
                for a in appointments
            ]
            sections.append("UPCOMING APPOINTMENTS:\n" + "\n".join(apt_lines))

        # Billing summary
        unbilled = TimeEntry.objects.filter(
            lawyer=user, invoiced=False, is_billable=True
        )
        if unbilled.exists():
            total_hours = sum(e.hours for e in unbilled)
            total_amount = sum(e.amount for e in unbilled)
            sections.append(
                f"UNBILLED WORK:\n"
                f"  - {unbilled.count()} entries | "
                f"{total_hours} hours | ${total_amount}"
            )

        # Outstanding invoices
        invoices = Invoice.objects.filter(
            case__lawyer=user,
            status__in=['sent', 'overdue']
        )[:5]
        if invoices:
            inv_lines = [
                f"  - {inv.invoice_number} | case={inv.case.case_number} | "
                f"amount=${inv.total_amount} | status={inv.status}"
                for inv in invoices
            ]
            sections.append("OUTSTANDING INVOICES:\n" + "\n".join(inv_lines))

    elif user.role == 'admin':
        # --- Admin sees system-wide summary ---
        from accounts.models import User
        total_users = User.objects.count()
        total_clients = User.objects.filter(role='client').count()
        total_lawyers = User.objects.filter(role='lawyer').count()
        total_cases = Case.objects.count()
        open_cases = Case.objects.filter(status__in=['open', 'in_progress']).count()

        sections.append(
            f"SYSTEM OVERVIEW:\n"
            f"  - Total users: {total_users} (clients={total_clients}, lawyers={total_lawyers})\n"
            f"  - Total cases: {total_cases} (active={open_cases})"
        )

    return "\n\n".join(sections) if sections else "No records found for this user."


# --- System prompt template ---
SYSTEM_PROMPT = """You are a legal assistant AI embedded inside a law firm management portal called "Legal Portal".

CURRENT USER: {user_name} (role: {role})
TODAY'S DATE: {today}

YOUR CAPABILITIES:
- Answer questions about the user's cases, appointments, invoices, and billing
- Explain legal processes and terminology in simple language
- Provide guidance on next steps for their cases
- Help with appointment scheduling queries
- Clarify billing and invoice details

RULES:
1. Base your answers on the USER DATA below. If the data doesn't contain an answer, say so.
2. NEVER fabricate case numbers, dates, amounts, or names. Only reference what's in the data.
3. You are NOT a licensed attorney. Never give definitive legal advice. Always recommend consulting their assigned lawyer for legal decisions.
4. Be concise, professional, and helpful.
5. If asked about another user's data, politely refuse — you can only discuss the current user's records.
6. For role=client: help them understand their case status, upcoming dates, and bills.
   For role=lawyer: help them manage workload, billing, and schedule.
   For role=admin: help them with system overview and user management queries.

USER DATA:
{context}
"""


def get_system_prompt(user):
    """Build the full system prompt with user context injected."""
    context = build_user_context(user)
    return SYSTEM_PROMPT.format(
        user_name=user.full_name,
        role=user.role,
        today=timezone.now().strftime('%Y-%m-%d'),
        context=context,
    )


def _is_api_key_configured():
    """Check if a valid OpenAI API key is configured."""
    key = getattr(settings, 'OPENAI_API_KEY', '')
    return bool(key and key != 'your-openai-api-key-here' and len(key) > 20)


def _get_builtin_response(user, user_message, context_data):
    """
    Built-in AI that answers questions using the user's data.
    Works without any external API - uses keyword matching and context parsing.
    """
    msg = user_message.lower().strip()
    now = timezone.now()

    # --- GREETING ---
    if any(w in msg for w in ['hello', 'hi', 'hey', 'good morning', 'good afternoon', 'good evening']):
        return (
            f"Hello {user.full_name}! I'm your Legal Portal AI assistant. "
            f"I can help you with information about your cases, appointments, invoices, and more. "
            f"What would you like to know?"
        )

    # --- HELP / CAPABILITIES ---
    if any(w in msg for w in ['help', 'what can you do', 'capabilities', 'how can you help']):
        if user.role == 'client':
            return (
                "I can help you with:\n\n"
                "- **Cases**: View your active cases and their status\n"
                "- **Appointments**: Check upcoming appointments\n"
                "- **Invoices**: Review unpaid bills and payment details\n"
                "- **Legal terms**: Explain legal terminology in simple language\n\n"
                "Just ask me a question like 'What are my active cases?' or 'Do I have unpaid invoices?'"
            )
        elif user.role == 'lawyer':
            return (
                "I can help you with:\n\n"
                "- **Cases**: Review your assigned cases and workload\n"
                "- **Appointments**: Check your schedule\n"
                "- **Billing**: View unbilled hours and outstanding invoices\n"
                "- **Workload**: Summarize your current caseload\n\n"
                "Just ask me something like 'Show my cases' or 'How much unbilled work do I have?'"
            )
        else:
            return (
                "I can help you with:\n\n"
                "- **System overview**: User counts, case statistics\n"
                "- **Platform metrics**: Active cases, registered users\n\n"
                "Ask me something like 'How many users are registered?' or 'Show system overview'"
            )

    # --- CASES ---
    if any(w in msg for w in ['case', 'cases', 'matter', 'matters']):
        if user.role == 'client':
            cases = Case.objects.filter(client=user).select_related('lawyer')
            if not cases.exists():
                return "You don't have any cases at the moment. You can create a new case from your dashboard."

            active = cases.filter(status__in=['open', 'in_progress'])
            response = f"You have **{cases.count()} total case(s)**"
            if active.exists():
                response += f", with **{active.count()} active**.\n\n"
            else:
                response += ".\n\n"

            if 'active' in msg or 'open' in msg or 'current' in msg:
                case_list = active if active.exists() else cases
            else:
                case_list = cases

            for c in case_list[:8]:
                priority_label = f" [{c.priority.upper()}]" if c.priority in ['high', 'urgent'] else ""
                lawyer_name = c.lawyer.full_name if c.lawyer else 'Unassigned'
                response += (
                    f"- **{c.case_number}**: {c.title} "
                    f"(Status: {c.get_status_display()}{priority_label}, "
                    f"Lawyer: {lawyer_name})\n"
                )

            return response

        elif user.role == 'lawyer':
            cases = Case.objects.filter(lawyer=user).select_related('client')
            if not cases.exists():
                return "You have no assigned cases at the moment."

            active = cases.filter(status__in=['open', 'in_progress'])
            response = f"You have **{cases.count()} assigned case(s)**, with **{active.count()} active**.\n\n"

            if 'active' in msg or 'open' in msg or 'current' in msg:
                case_list = active if active.exists() else cases
            else:
                case_list = cases

            for c in case_list[:10]:
                priority_label = f" [{c.priority.upper()}]" if c.priority in ['high', 'urgent'] else ""
                client_name = c.client.full_name if c.client else 'Unknown'
                response += (
                    f"- **{c.case_number}**: {c.title} "
                    f"(Status: {c.get_status_display()}{priority_label}, "
                    f"Client: {client_name})\n"
                )

            return response

        else:  # admin
            total = Case.objects.count()
            open_c = Case.objects.filter(status='open').count()
            in_progress = Case.objects.filter(status='in_progress').count()
            pending = Case.objects.filter(status='pending').count()
            closed = Case.objects.filter(status='closed').count()

            return (
                f"**System Case Statistics:**\n\n"
                f"- Total cases: **{total}**\n"
                f"- Open: **{open_c}**\n"
                f"- In Progress: **{in_progress}**\n"
                f"- Pending: **{pending}**\n"
                f"- Closed: **{closed}**"
            )

    # --- APPOINTMENTS ---
    if any(w in msg for w in ['appointment', 'schedule', 'upcoming', 'meeting']):
        if user.role == 'client':
            appointments = Appointment.objects.filter(
                case__client=user,
                datetime__gte=now,
                status__in=['scheduled', 'confirmed']
            ).select_related('case')[:5]
        elif user.role == 'lawyer':
            appointments = Appointment.objects.filter(
                case__lawyer=user,
                datetime__gte=now,
                status__in=['scheduled', 'confirmed']
            ).select_related('case')[:5]
        else:
            appointments = Appointment.objects.filter(
                datetime__gte=now,
                status__in=['scheduled', 'confirmed']
            ).select_related('case')[:10]

        if not appointments:
            return "You have no upcoming appointments scheduled."

        response = f"You have **{len(appointments)} upcoming appointment(s)**:\n\n"
        for a in appointments:
            response += (
                f"- **{a.case.case_number}** | {a.appointment_type} | "
                f"{a.datetime.strftime('%B %d, %Y at %I:%M %p')} | "
                f"Status: {a.status}\n"
            )

        return response

    # --- INVOICES / BILLING ---
    if any(w in msg for w in ['invoice', 'invoices', 'bill', 'billing', 'payment', 'unpaid', 'outstanding', 'owe', 'pay']):
        if user.role == 'client':
            invoices = Invoice.objects.filter(
                case__client=user,
                status__in=['sent', 'overdue']
            ).select_related('case')

            if not invoices.exists():
                return "You have no unpaid invoices. All your bills are up to date!"

            total_owed = sum(inv.total_amount for inv in invoices)
            response = f"You have **{invoices.count()} unpaid invoice(s)** totaling **${total_owed:.2f}**:\n\n"
            for inv in invoices[:5]:
                status_label = " **[OVERDUE]**" if inv.status == 'overdue' else ""
                response += (
                    f"- **{inv.invoice_number}** | Case: {inv.case.case_number} | "
                    f"Amount: **${inv.total_amount:.2f}**{status_label}"
                )
                if inv.due_date:
                    response += f" | Due: {inv.due_date.strftime('%B %d, %Y')}"
                response += "\n"

            response += "\nYou can view and manage these invoices from your Billing section."
            return response

        elif user.role == 'lawyer':
            # Unbilled work
            unbilled = TimeEntry.objects.filter(
                lawyer=user, invoiced=False, is_billable=True
            )
            outstanding_inv = Invoice.objects.filter(
                case__lawyer=user,
                status__in=['sent', 'overdue']
            )

            response = "**Your Billing Summary:**\n\n"

            if unbilled.exists():
                total_hours = sum(e.hours for e in unbilled)
                total_amount = sum(e.amount for e in unbilled)
                response += f"- Unbilled work: **{unbilled.count()} entries**, **{total_hours} hours**, worth **${total_amount:.2f}**\n"
            else:
                response += "- No unbilled work\n"

            if outstanding_inv.exists():
                total_outstanding = sum(inv.total_amount for inv in outstanding_inv)
                response += f"- Outstanding invoices: **{outstanding_inv.count()}**, totaling **${total_outstanding:.2f}**\n"
            else:
                response += "- No outstanding invoices\n"

            return response

        else:  # admin
            total_invoices = Invoice.objects.count()
            total_billed = Invoice.objects.exclude(
                status__in=['draft', 'cancelled']
            ).aggregate(total=Sum('total_amount'))['total'] or 0
            admin_revenue = Invoice.objects.exclude(
                status__in=['draft', 'cancelled']
            ).aggregate(total=Sum('admin_share'))['total'] or 0

            return (
                f"**System Billing Overview:**\n\n"
                f"- Total invoices: **{total_invoices}**\n"
                f"- Total billed: **${total_billed:.2f}**\n"
                f"- Admin revenue (20%): **${admin_revenue:.2f}**"
            )

    # --- SYSTEM OVERVIEW (admin) ---
    if user.role == 'admin' and any(w in msg for w in ['overview', 'stats', 'statistics', 'summary', 'users', 'how many']):
        from accounts.models import User
        total_users = User.objects.count()
        total_clients = User.objects.filter(role='client').count()
        total_lawyers = User.objects.filter(role='lawyer').count()
        total_cases = Case.objects.count()
        active_cases = Case.objects.filter(status__in=['open', 'in_progress']).count()

        return (
            f"**System Overview:**\n\n"
            f"- Total users: **{total_users}** (Clients: {total_clients}, Lawyers: {total_lawyers})\n"
            f"- Total cases: **{total_cases}** (Active: {active_cases})\n"
        )

    # --- LEGAL TERMS ---
    legal_terms = {
        'plaintiff': "The **plaintiff** is the person or party who brings a case against another in a court of law.",
        'defendant': "The **defendant** is the person or party being accused or sued in a case.",
        'litigation': "**Litigation** is the process of taking a dispute to court. It includes filing lawsuits, discovery, trial, and appeal.",
        'deposition': "A **deposition** is a sworn out-of-court testimony given by a witness, recorded for use in court.",
        'discovery': "**Discovery** is the pre-trial phase where both parties exchange relevant information and evidence.",
        'brief': "A **brief** is a written legal document submitted to a court that presents the facts, laws, and arguments in a case.",
        'verdict': "A **verdict** is the final decision made by a jury or judge in a trial.",
        'statute of limitations': "The **statute of limitations** is the maximum time after an event within which legal proceedings may be initiated.",
        'injunction': "An **injunction** is a court order requiring a party to do or stop doing a specific action.",
        'subpoena': "A **subpoena** is a legal document ordering someone to attend court or produce documents.",
        'affidavit': "An **affidavit** is a written statement confirmed by oath or affirmation, used as evidence in court.",
        'bail': "**Bail** is the temporary release of an accused person awaiting trial, sometimes on condition that a sum of money is lodged.",
        'arbitration': "**Arbitration** is a form of alternative dispute resolution where a neutral third party makes a binding decision.",
        'mediation': "**Mediation** is a process where a neutral mediator helps disputing parties reach a mutually acceptable agreement.",
    }

    for term, definition in legal_terms.items():
        if term in msg:
            return f"{definition}\n\nNote: For specific legal advice related to your case, please consult your assigned lawyer."

    # --- THANK YOU ---
    if any(w in msg for w in ['thank', 'thanks', 'appreciate']):
        return "You're welcome! If you have any more questions, feel free to ask."

    # --- DEFAULT / FALLBACK ---
    return (
        f"I understand you're asking about: \"{user_message}\"\n\n"
        f"I can help you with:\n"
        f"- **Your cases** - Ask \"What are my active cases?\"\n"
        f"- **Appointments** - Ask \"Do I have upcoming appointments?\"\n"
        f"- **Invoices/Billing** - Ask \"Show my unpaid invoices\"\n"
        f"- **Legal terms** - Ask \"What does plaintiff mean?\"\n\n"
        f"Please try rephrasing your question, or ask about one of the topics above."
    )


def get_ai_response(user, user_message, chat_history):
    """
    Send the conversation to the LLM and return the assistant's reply.

    If a valid OpenAI API key is configured, uses OpenAI.
    Otherwise, uses the built-in context-aware response system.
    """
    context_data = build_user_context(user)

    # Try OpenAI if configured
    if _is_api_key_configured():
        try:
            import openai

            client = openai.OpenAI(api_key=settings.OPENAI_API_KEY)

            # Build messages array
            messages = [{"role": "system", "content": get_system_prompt(user)}]

            # Include last 20 messages for conversation memory
            for msg in chat_history[-20:]:
                messages.append({"role": msg.role, "content": msg.content})

            messages.append({"role": "user", "content": user_message})

            response = client.chat.completions.create(
                model=getattr(settings, 'AI_MODEL', 'gpt-4'),
                messages=messages,
                max_tokens=1024,
                temperature=0.7,
            )

            return response.choices[0].message.content

        except Exception as e:
            # If OpenAI fails, fall through to built-in AI
            pass

    # Use built-in AI response
    return _get_builtin_response(user, user_message, context_data)
