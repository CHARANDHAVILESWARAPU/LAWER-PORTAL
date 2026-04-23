from django.db import models
from accounts.models import User
from cases.models import Case
from decimal import Decimal


class TimeEntry(models.Model):
    """
    Time entry model for tracking billable hours.
    Lawyers log time spent on cases.
    """
    case = models.ForeignKey(
        Case, on_delete=models.CASCADE, related_name='time_entries'
    )
    lawyer = models.ForeignKey(
        User, on_delete=models.CASCADE, related_name='time_entries'
    )
    date = models.DateField()
    hours = models.DecimalField(max_digits=5, decimal_places=2)
    description = models.TextField()
    hourly_rate = models.DecimalField(max_digits=10, decimal_places=2)
    is_billable = models.BooleanField(default=True)
    invoiced = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    @property
    def amount(self):
        """Calculate amount for this entry."""
        return self.hours * self.hourly_rate if self.is_billable else Decimal('0.00')

    def __str__(self):
        return f"{self.hours}h on {self.case.case_number} ({self.date})"

    class Meta:
        db_table = 'time_entries'
        ordering = ['-date', '-created_at']


class Invoice(models.Model):
    """
    Invoice model for billing clients.
    Groups time entries into an invoice.
    """
    STATUS_CHOICES = [
        ('draft', 'Draft'),
        ('sent', 'Sent'),
        ('paid', 'Paid'),
        ('overdue', 'Overdue'),
        ('cancelled', 'Cancelled'),
    ]

    invoice_number = models.CharField(max_length=50, unique=True, blank=True)
    case = models.ForeignKey(
        Case, on_delete=models.CASCADE, related_name='invoices'
    )
    entries = models.ManyToManyField(TimeEntry, related_name='invoices')
    subtotal = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    tax_rate = models.DecimalField(max_digits=5, decimal_places=2, default=0)
    tax_amount = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    total_amount = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    admin_share = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    lawyer_share = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='draft')
    notes = models.TextField(blank=True)
    due_date = models.DateField(null=True, blank=True)
    paid_date = models.DateField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def save(self, *args, **kwargs):
        if not self.invoice_number:
            # Auto-generate invoice number: INV-YYYY-XXXX
            from datetime import datetime
            year = datetime.now().year
            last_invoice = Invoice.objects.filter(
                invoice_number__startswith=f'INV-{year}'
            ).order_by('-id').first()
            if last_invoice:
                last_num = int(last_invoice.invoice_number.split('-')[-1])
                self.invoice_number = f'INV-{year}-{last_num + 1:04d}'
            else:
                self.invoice_number = f'INV-{year}-0001'
        super().save(*args, **kwargs)

    def calculate_totals(self):
        """Recalculate invoice totals from entries."""
        self.subtotal = sum(entry.amount for entry in self.entries.all())
        self.tax_amount = self.subtotal * (self.tax_rate / 100)
        self.total_amount = self.subtotal + self.tax_amount
        self.admin_share = self.total_amount * Decimal('0.10')
        self.lawyer_share = self.total_amount - self.admin_share
        self.save()

    def __str__(self):
        return f"{self.invoice_number} - {self.case.case_number}"

    class Meta:
        db_table = 'invoices'
        ordering = ['-created_at']
