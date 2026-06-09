// Contact Form Handler
document.addEventListener('DOMContentLoaded', () => {
    const contactForm = document.getElementById('contactForm');
    const formMessage = document.getElementById('formMessage');

    if (contactForm) {
        contactForm.addEventListener('submit', (e) => {
            e.preventDefault();
            handleContactSubmit();
        });
    }
});

function handleContactSubmit() {
    const form = document.getElementById('contactForm');
    const formMessage = document.getElementById('formMessage');

    // Get form data
    const formData = new FormData(form);
    const data = Object.fromEntries(formData);

    // Validate form
    if (!data.name || !data.email || !data.subject || !data.message) {
        showMessage('Please fill in all required fields.', 'error', formMessage);
        return;
    }

    // Validate email
    if (!isValidEmail(data.email)) {
        showMessage('Please enter a valid email address.', 'error', formMessage);
        return;
    }

    // Validate checkbox
    if (!data.privacy) {
        showMessage('Please agree to the privacy policy and terms of service.', 'error', formMessage);
        return;
    }

    // Simulate form submission
    submitContactForm(data, formMessage, form);
}

function isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}

function submitContactForm(data, messageElement, form) {
    // Disable submit button
    const submitBtn = form.querySelector('button[type="submit"]');
    const originalText = submitBtn.innerHTML;
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Sending...';

    // Simulate API call (in real app, send to backend)
    setTimeout(() => {
        // Success response
        showMessage(
            'Thank you for your message! We will get back to you within 24 hours.',
            'success',
            messageElement
        );

        // Reset form
        form.reset();

        // Re-enable button
        submitBtn.disabled = false;
        submitBtn.innerHTML = originalText;

        // Log the data (in real app, this would be sent to server)
        console.log('Contact form submitted:', data);

        // Optional: You can send this to a backend API
        // sendToBackend(data);
    }, 1500);
}

function showMessage(message, type, messageElement) {
    messageElement.textContent = message;
    messageElement.className = `form-message ${type}`;
    messageElement.style.display = 'block';

    // Auto-hide success messages after 5 seconds
    if (type === 'success') {
        setTimeout(() => {
            messageElement.style.display = 'none';
        }, 5000);
    }
}

// Optional: Send to backend
async function sendToBackend(data) {
    try {
        const response = await fetch('/api/contact', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(data)
        });

        if (response.ok) {
            console.log('Message sent to server successfully');
        } else {
            console.error('Failed to send message to server');
        }
    } catch (error) {
        console.error('Error sending message:', error);
    }
}
