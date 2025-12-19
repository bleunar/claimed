import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from flask import current_app, render_template

class EmailService:
    def send_email(self, to, subject, body, html_body=None):
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
            msg = MIMEMultipart('alternative')
            msg['From'] = "CLAIMS <claims.cite@gmail.com>"
            msg['To'] = to
            msg['Subject'] = subject
            
            # Attach plain text version
            msg.attach(MIMEText(body, 'plain'))
            
            # Attach HTML version if provided
            if html_body:
                msg.attach(MIMEText(html_body, 'html'))

            server = smtplib.SMTP(server_host, server_port)
            if use_tls:
                server.starttls()
            
            server.login(username, password)
            server.send_message(msg)
            server.quit()
        except Exception as e:
            print(f" [ERROR] Failed to send email to {to}: {str(e)}")
            # Fallback to print so OTP is not lost in case of transient error
            print(f"------------\n[FALLBACK EMAIL] To: {to}\nSubject: {subject}\nBody: {body}\n------------")

    def send_otp_email(self, to, otp_code, action="Verification", user_name="User"):
        """
        Sends an OTP email using the HTML template.
        """
        subject = f"{action} OTP Code"
        plain_body = f"Hello {user_name},\n\nYour OTP code is: {otp_code}\nThis code will expire in 5 minutes.\n\nDo not share this code."
        
        try:
            html_body = render_template('otp_email.html', 
                                      user_name=user_name, 
                                      otp_code=otp_code, 
                                      validity_minutes=5)
        except Exception as e:
            print(f" [WARNING] Failed to render email template: {e}")
            html_body = None

        self.send_email(to, subject, plain_body, html_body)

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
