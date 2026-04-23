"""
Meeting security service.

Token validation ensures only the two authorized participants
(client + lawyer) can join a meeting room via the validated link.
"""

import hmac
import hashlib
from django.conf import settings


def generate_meeting_token(meeting_id):
    """
    Generate an HMAC-SHA256 token for a meeting.
    This token is stored in the DB and must be provided
    in the join URL to prove authorization.
    """
    key = settings.SECRET_KEY.encode()
    msg = str(meeting_id).encode()
    return hmac.new(key, msg, hashlib.sha256).hexdigest()[:48]


def validate_meeting_token(meeting_id, token):
    """
    Constant-time comparison of the provided token
    against the expected HMAC for this meeting_id.
    """
    expected = generate_meeting_token(meeting_id)
    return hmac.compare_digest(expected, token)
