/** "K7Q2M9XAPZ3B" → "K7Q2-M9XA-PZ3B" */
export const prettyCode = (code: string) => code.match(/.{1,4}/g)?.join('-') ?? code

export const inviteLink = (code: string) => `${window.location.origin}/entrar/${code}`

export function whatsappLink(text: string) {
  return `https://wa.me/?text=${encodeURIComponent(text)}`
}

export function inviteText(tripName: string, code: string) {
  return `Bora organizar a viagem "${tripName}"! Entra aqui: ${inviteLink(code)} (código ${prettyCode(code)})`
}
