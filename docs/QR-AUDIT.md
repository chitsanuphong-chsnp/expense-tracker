# Imported QR audit

Inspected the imported QR payloads for the configured primary owner on 2026-10-06 (Asia/Bangkok): 7 records, comprising ttb 4, K-PLUS 1, Krungthai 1, MAKE 1. No images or financial reference values are copied into this document.

All payloads pass the installed promptparse Mini QR validator. Tags are:
- 00.00: API type 000001
- 00.01: sending bank code (ttb 011, K-PLUS/MAKE 004, Krungthai 006)
- 00.02: transaction reference
- 51: TH
- 91: CRC/checksum

No dedicated amount, recipient, sender, transaction time or direction fields are present in these seven payloads. ttb references contain a prefix resembling YYMMDDHHmmss; this is an observation, not a documented timestamp field. The application does not convert it to a transaction timestamp or use it for reporting. K-PLUS and MAKE both identify sending bank 004; the original slip source remains separate from the sending bank.

The authenticated dataset now derives qr_details from the stored payload on read, so existing slips get extracted fields without reprocessing or a DB migration. The slip detail and record screens show those fields, missing information and the distinction between valid QR structure and bank verification. No OCR or external slip inquiry is used, and no new financial transactions are invented.