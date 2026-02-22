type LeadData = {
  adminPhone: string
  customerName: string
  area?: string | null
  price?: string | null
  projectId?: string | null
  customNotes?: string | null
}

export function generateWhatsAppLink(type: 'survey' | 'consultation', data: LeadData): string {
  const phone = data.adminPhone.replace(/\D+/g, '')
  let message = ''
  if (type === 'survey') {
    message = 'Halo Admin Kokohin, saya mau booking jadwal survei untuk proyek kanopi.%0A%0A'
    message += `Nama: ${data.customerName || 'Customer'}%0A`
    if (data.area) message += `Luas Area: ${data.area} m²%0A`
    if (data.price) message += `Estimasi Harga: ${data.price}%0A`
    if (data.projectId) message += `ID Lead: ${data.projectId}%0A`
    message += '%0ASilahkan konfirmasi ketersediaan jadwal survei. Terima kasih!'
  } else {
    message = 'Halo Admin Kokohin, saya ingin konsultasi untuk desain custom kanopi.%0A%0A'
    message += `Nama: ${data.customerName || 'Customer'}%0A`
    if (data.customNotes) message += `Catatan: ${data.customNotes}%0A`
    if (data.projectId) message += `ID Lead: ${data.projectId}%0A`
    message += '%0ASilahkan hubungi saya untuk diskusi lebih lanjut. Terima kasih!'
  }
  return `https://wa.me/${phone}?text=${message}`
}
