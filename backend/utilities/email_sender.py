import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from flask import current_app

def send_email(recipients, subject, html_body):
    """
    Sends an email to the specified recipients.
    
    Args:
        recipients (list): List of email addresses.
        subject (str): Email subject.
        html_body (str): HTML content of the email.
        
    Returns:
        bool: True if sent successfully, False otherwise.
    """
    if not recipients:
        print("No recipients provided.")
        return False

    sender_email = current_app.config['MAIL_USERNAME']
    password = current_app.config['MAIL_PASSWORD']
    smtp_server = current_app.config['MAIL_SERVER']
    smtp_port = current_app.config['MAIL_PORT']
    use_tls = current_app.config['MAIL_USE_TLS']

    msg = MIMEMultipart()
    msg['From'] = sender_email
    msg['To'] = ", ".join(recipients)
    msg['Subject'] = subject

    msg.attach(MIMEText(html_body, 'html'))

    try:
        if use_tls:
             server = smtplib.SMTP(smtp_server, smtp_port)
             server.starttls()
        else:
             server = smtplib.SMTP_SSL(smtp_server, smtp_port)
             
        server.login(sender_email, password)
        server.sendmail(sender_email, recipients, msg.as_string())
        server.quit()
        print(f"Email sent to {recipients}")
        return True
    except Exception as e:
        print(f"Failed to send email: {e}")
        return False
