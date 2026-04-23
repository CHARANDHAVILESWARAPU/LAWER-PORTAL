"""
End-to-end encryption module using AES-256-GCM.
Provides secure encryption for messages between clients and lawyers.
"""
from Crypto.Cipher import AES
from Crypto.Random import get_random_bytes
import base64
from django.conf import settings


def get_encryption_key():
    """
    Derive a 32-byte key from Django's SECRET_KEY.
    In production, use a separate encryption key stored securely.
    """
    key = settings.SECRET_KEY[:32].encode('utf-8')
    # Pad or truncate to exactly 32 bytes (256 bits)
    return key.ljust(32, b'\0')[:32]


def encrypt_message(plaintext):
    """
    Encrypt a message using AES-256-GCM.

    Args:
        plaintext: The message to encrypt (string)

    Returns:
        Base64 encoded string containing: nonce + tag + ciphertext

    How it works:
    1. Generate random 16-byte nonce (number used once)
    2. Create AES cipher in GCM mode (provides authentication)
    3. Encrypt the message and get authentication tag
    4. Concatenate nonce + tag + ciphertext and base64 encode
    """
    key = get_encryption_key()
    cipher = AES.new(key, AES.MODE_GCM)

    # Encrypt and get authentication tag
    ciphertext, tag = cipher.encrypt_and_digest(plaintext.encode('utf-8'))

    # Combine: nonce (16) + tag (16) + ciphertext
    encrypted_data = cipher.nonce + tag + ciphertext

    # Base64 encode for storage
    return base64.b64encode(encrypted_data).decode('utf-8')


def decrypt_message(encrypted_data):
    """
    Decrypt a message encrypted with encrypt_message.

    Args:
        encrypted_data: Base64 encoded encrypted message

    Returns:
        Decrypted plaintext string

    Raises:
        ValueError: If decryption fails (tampering detected)
    """
    try:
        key = get_encryption_key()

        # Decode from base64
        data = base64.b64decode(encrypted_data.encode('utf-8'))

        # Extract components
        nonce = data[:16]      # First 16 bytes
        tag = data[16:32]      # Next 16 bytes
        ciphertext = data[32:] # Rest is ciphertext

        # Create cipher and decrypt
        cipher = AES.new(key, AES.MODE_GCM, nonce=nonce)
        plaintext = cipher.decrypt_and_verify(ciphertext, tag)

        return plaintext.decode('utf-8')
    except Exception as e:
        raise ValueError(f"Decryption failed: {str(e)}")
