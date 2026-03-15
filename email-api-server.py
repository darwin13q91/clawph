from flask import Flask, request, jsonify
from flask_cors import CORS
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
import os

app = Flask(__name__)

# Configure CORS - allow requests from amajungle.com and localhost for testing
CORS(app, resources={
    r"/api/*": {
        "origins": [
            "https://amajungle.com",
            "https://www.amajungle.com",
            "http://localhost:5173",
            "http://localhost:3000",
            "http://localhost:4173"
        ],
        "methods": ["POST", "OPTIONS"],
        "allow_headers": ["Content-Type"]
    }
})

# PrivateEmail SMTP configuration
SMTP_SERVER = "smtp.privateemail.com"
SMTP_PORT = 465  # SSL port
FROM_EMAIL = "hello@amajungle.com"
FROM_NAME = "Amajungle"
RECIPIENT_EMAIL = "hello@amajungle.com"  # Where leads are sent

@app.route('/api/send-email', methods=['POST', 'OPTIONS'])
def send_email():
    # Handle preflight OPTIONS request
    if request.method == 'OPTIONS':
        return jsonify({"status": "ok"}), 200
    
    try:
        data = request.get_json()
        
        # Validate required fields
        if not data or 'to_email' not in data or 'subject' not in data:
            return jsonify({
                "error": "Missing required fields: to_email, subject"
            }), 400
        
        to_email = data.get('to_email')
        subject = data.get('subject')
        message_html = data.get('message', '')
        from_name = data.get('from_name', 'Amajungle Lead')
        service = data.get('service', 'general')
        
        # Get additional form data if provided
        client_name = data.get('client_name', '')
        client_email = data.get('client_email', '')
        client_phone = data.get('client_phone', '')
        client_company = data.get('client_company', '')
        client_message = data.get('client_message', '')
        
        # Build HTML email body if not provided
        if not message_html:
            message_html = f"""
            <html>
            <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
                <h2 style="color: #0B3A2C;">New Lead from Amajungle Website</h2>
                <table style="border-collapse: collapse; width: 100%; max-width: 600px;">
                    <tr>
                        <td style="padding: 10px; border-bottom: 1px solid #ddd; font-weight: bold;">Name:</td>
                        <td style="padding: 10px; border-bottom: 1px solid #ddd;">{client_name or from_name}</td>
                    </tr>
                    <tr>
                        <td style="padding: 10px; border-bottom: 1px solid #ddd; font-weight: bold;">Email:</td>
                        <td style="padding: 10px; border-bottom: 1px solid #ddd;">{client_email or to_email}</td>
                    </tr>
                    <tr>
                        <td style="padding: 10px; border-bottom: 1px solid #ddd; font-weight: bold;">Phone:</td>
                        <td style="padding: 10px; border-bottom: 1px solid #ddd;">{client_phone or 'Not provided'}</td>
                    </tr>
                    <tr>
                        <td style="padding: 10px; border-bottom: 1px solid #ddd; font-weight: bold;">Company:</td>
                        <td style="padding: 10px; border-bottom: 1px solid #ddd;">{client_company or 'Not provided'}</td>
                    </tr>
                    <tr>
                        <td style="padding: 10px; border-bottom: 1px solid #ddd; font-weight: bold;">Service:</td>
                        <td style="padding: 10px; border-bottom: 1px solid #ddd;">{service}</td>
                    </tr>
                    <tr>
                        <td style="padding: 10px; font-weight: bold; vertical-align: top;">Message:</td>
                        <td style="padding: 10px;">{client_message or 'No additional message provided'}</td>
                    </tr>
                </table>
                <p style="margin-top: 30px; font-size: 12px; color: #666;">
                    This email was sent from the contact form on amajungle.com
                </p>
            </body>
            </html>
            """
        
        # Build PLAIN TEXT version for Echo to parse
        message_plain = f"""New Lead from Amajungle Website

Name: {client_name or from_name}
Email: {client_email or to_email}
Phone: {client_phone or 'Not provided'}
Company: {client_company or 'Not provided'}
Service: {service}

Message:
{client_message or 'No additional message provided'}

---
Sent from amajungle.com contact form
"""
        
        # Create email message with both HTML and plain text
        msg = MIMEMultipart('alternative')
        msg['Subject'] = subject
        msg['From'] = f"{FROM_NAME} <{FROM_EMAIL}>"
        msg['To'] = RECIPIENT_EMAIL
        
        # Attach PLAIN TEXT first (for Echo to parse)
        msg.attach(MIMEText(message_plain, 'plain'))
        
        # Attach HTML version
        msg.attach(MIMEText(message_html, 'html'))
        
        # Get password from environment variable
        password = os.environ.get('HELLO_PASS')
        if not password:
            return jsonify({
                "error": "Server configuration error: Email password not configured"
            }), 500
        
        # Send email via PrivateEmail SMTP
        with smtplib.SMTP_SSL(SMTP_SERVER, SMTP_PORT) as server:
            server.login(FROM_EMAIL, password)
            server.sendmail(FROM_EMAIL, RECIPIENT_EMAIL, msg.as_string())
        
        return jsonify({
            "status": "success",
            "message": "Email sent successfully"
        }), 200
        
    except smtplib.SMTPAuthenticationError:
        return jsonify({
            "error": "Email authentication failed. Please check credentials."
        }), 500
    except smtplib.SMTPException as e:
        return jsonify({
            "error": f"SMTP error: {str(e)}"
        }), 500
    except Exception as e:
        return jsonify({
            "error": f"Failed to send email: {str(e)}"
        }), 500

@app.route('/health', methods=['GET'])
def health_check():
    return jsonify({
        "status": "healthy",
        "service": "amajungle-email-api"
    }), 200

@app.route('/', methods=['GET'])
def index():
    return jsonify({
        "service": "Amajungle Email API",
        "version": "1.0.0",
        "endpoints": {
            "/api/send-email": "POST - Send email via PrivateEmail SMTP",
            "/health": "GET - Health check"
        }
    }), 200

# For local development
if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5000))
    app.run(host='0.0.0.0', port=port, debug=False)
