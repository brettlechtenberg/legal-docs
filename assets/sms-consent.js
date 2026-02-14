(() => {
  const normalizePhoneNumber = (value) => {
    if (!value) return null

    const trimmed = value.trim()
    if (!trimmed) return null

    if (trimmed.startsWith("+")) {
      const cleaned = `+${trimmed.slice(1).replace(/[\\s().-]/g, "")}`
      return /^\\+[1-9]\\d{7,14}$/.test(cleaned) ? cleaned : null
    }

    const digitsOnly = trimmed.replace(/\\D/g, "")

    // Common US inputs (10 digits)
    if (digitsOnly.length === 10) return `+1${digitsOnly}`

    // US with leading country code (11 digits)
    if (digitsOnly.length === 11 && digitsOnly.startsWith("1")) return `+${digitsOnly}`

    // Fall back to treating digits as a full E.164 number without the +
    if (digitsOnly.length >= 8 && digitsOnly.length <= 15) return `+${digitsOnly}`

    return null
  }

  const setStatus = (statusEl, message, tone) => {
    if (!statusEl) return

    statusEl.textContent = message
    statusEl.dataset.tone = tone
  }

  const safeText = (element) => (element?.textContent ?? "").trim()

  document.addEventListener("DOMContentLoaded", () => {
    const form = document.getElementById("sms-consent-form")
    if (!(form instanceof HTMLFormElement)) return

    const phoneInput = document.getElementById("sms-consent-phone")
    const checkbox = document.getElementById("sms-consent-checkbox")
    const consentTextEl = document.getElementById("sms-consent-consentText")
    const versionInput = document.getElementById("sms-consent-version")
    const statusEl = document.getElementById("sms-consent-status")
    const submitButton = form.querySelector("button[type='submit']")

    form.addEventListener("submit", async (event) => {
      event.preventDefault()

      const rawPhone = phoneInput instanceof HTMLInputElement ? phoneInput.value : ""
      const normalizedPhone = normalizePhoneNumber(rawPhone)

      if (!normalizedPhone) {
        setStatus(statusEl, "Enter a valid mobile number (e.g., +15555555555).", "error")
        if (phoneInput instanceof HTMLInputElement) phoneInput.focus()
        return
      }

      if (!(checkbox instanceof HTMLInputElement) || checkbox.checked !== true) {
        setStatus(statusEl, "Please check the consent box to opt in.", "error")
        if (checkbox instanceof HTMLInputElement) checkbox.focus()
        return
      }

      const apiUrl = form.dataset.apiUrl || "/api/sms-consent"
      const consentText = safeText(consentTextEl)
      const consentVersion =
        versionInput instanceof HTMLInputElement ? versionInput.value.trim() : "unknown"

      if (!consentText) {
        setStatus(statusEl, "Consent text is missing. Please refresh and try again.", "error")
        return
      }

      const payload = {
        phoneNumber: normalizedPhone,
        consent: true,
        consentText,
        consentVersion,
        pageUrl: window.location.href,
      }

      if (submitButton instanceof HTMLButtonElement) submitButton.disabled = true
      setStatus(statusEl, "Saving…", "loading")

      try {
        const response = await fetch(apiUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        })

        const json = await response.json().catch(() => null)
        if (!response.ok) {
          throw new Error(json?.error || `Request failed (${response.status})`)
        }

        form.reset()
        setStatus(statusEl, "Saved. You’re opted in. Reply STOP to opt out.", "success")
      } catch (error) {
        const message = error instanceof Error ? error.message : "Something went wrong. Try again."
        setStatus(statusEl, message, "error")
      } finally {
        if (submitButton instanceof HTMLButtonElement) submitButton.disabled = false
      }
    })
  })
})()

