const BREVO_SEND_EMAIL_URL = 'https://api.brevo.com/v3/smtp/email'

const normalizeEmail = (value) =>
  typeof value === 'string' && value.trim() ? value.trim().toLowerCase() : ''

const isValidSenderEmail = (value) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizeEmail(value))

export const sendBrevoTransactionalEmail = async ({
  to,
  subject,
  htmlContent,
  textContent,
}) => {
  const apiKey = process.env.BREVO_API_KEY
  const senderEmail = normalizeEmail(process.env.BREVO_SENDER_EMAIL)
  const senderName = process.env.BREVO_SENDER_NAME || 'Cortina.D'

  if (!apiKey) {
    return {
      delivered: false,
      reason: 'missing-api-key',
    }
  }

  if (!isValidSenderEmail(senderEmail)) {
    return {
      delivered: false,
      reason: 'missing-sender-email',
    }
  }

  const response = await fetch(BREVO_SEND_EMAIL_URL, {
    method: 'POST',
    headers: {
      accept: 'application/json',
      'content-type': 'application/json',
      'api-key': apiKey,
    },
    body: JSON.stringify({
      sender: {
        name: senderName,
        email: senderEmail,
      },
      to: [
        {
          email: normalizeEmail(to),
        },
      ],
      subject,
      htmlContent,
      textContent,
    }),
  })

  if (!response.ok) {
    const responseText = await response.text()
    const error = new Error('Brevo email request failed')
    error.status = response.status
    error.details = responseText
    throw error
  }

  return {
    delivered: true,
  }
}
