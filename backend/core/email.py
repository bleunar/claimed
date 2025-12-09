import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from flask import current_app

class EmailService:
    def send_email(self, to, subject, body):
        """
        Sends an email using the configured SMTP server.
        Falls back to printing to console if configuration is missing.
        """
        server_host = current_app.config.get('MAIL_SERVER')
        server_port = current_app.config.get('MAIL_PORT')
        username = current_app.config.get('MAIL_USERNAME')
        password = current_app.config.get('MAIL_PASSWORD')
        use_tls = current_app.config.get('MAIL_USE_TLS')
        
        # If no credentials, mock it (dev mode)
        if not username or not password:
            print(f"------------\n[MOCK EMAIL] To: {to}\nSubject: {subject}\nBody: {body}\n------------")
            return

        try:
            msg = MIMEMultipart()
            msg['From'] = "CLAIMS <claims.cite@gmail.com>"
            msg['To'] = to
            msg['Subject'] = subject
            msg.attach(MIMEText(body, 'plain'))

            server = smtplib.SMTP(server_host, server_port)
            if use_tls:
                server.starttls()
            
            server.login(username, password)
            server.send_message(msg)
            server.quit()
            print(f" [INFO] Email sent to {to}")
        except Exception as e:
            print(f" [ERROR] Failed to send email to {to}: {str(e)}")
            # Fallback to print so OTP is not lost in case of transient error
            print(f"------------\n[FALLBACK EMAIL] To: {to}\nSubject: {subject}\nBody: {body}\n------------")

    def send_otp_email(self, to, otp_code, action="Verification"):
        """
        Sends an OTP email.
        """
        subject = f"{action} OTP Code"
        body = f"Your OTP code is: {otp_code}\nThis code will expire in 5 minutes."
        self.send_email(to, subject, body)

    def check_connection(self, app):
        server = app.config.get('MAIL_SERVER')
        port = app.config.get('MAIL_PORT')
        username = app.config.get('MAIL_USERNAME')
        password = app.config.get('MAIL_PASSWORD')
        use_tls = app.config.get('MAIL_USE_TLS')
        
        if not all([server, port, username, password]):
             print(" [WARNING] Email configuration missing. Emails will be mocked.")
             return False

        try:
             s = smtplib.SMTP(server, port)
             if use_tls:
                 s.starttls()
             s.login(username, password)
             s.quit()
             print(f" [OK] Connected to SMTP server {server}:{port}")
             return True
        except Exception as e:
             print(f" [ERROR] Could not connect to SMTP server: {str(e)}")
             return False

email_service = EmailService()
