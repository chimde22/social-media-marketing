// Configuration for SMM Order Management
export const CONFIG = {
  MARKUP_MULTIPLIER: 2.5, // Prices are increased by 2.5x
  EXCHANGE_RATE: 3450, // 1 USD = 3450 MNT (approx)
  BANK_DETAILS: {
    BANK: 'Хаан Банк',
    ACCOUNT: '5084590801',
    IBAN: '28000500',
    RECEIVER: 'SMM Panel'
  },
  // Танд захиалгын мэдээлэл ирэх Телеграм тохиргоо
  TELEGRAM: {
    BOT_TOKEN: '8772782802:AAEzzayIzeZUZ6dyuTnwS209vuCPSkWR9Po',
    CHAT_ID: '6966630599'
  }
};

export const SERVICES_DATA = {
  instagram: [
    { id: 1, name: 'Instagram Followers [High Quality]', rate: 2.50 }, // Base Rate per 1000
    { id: 2, name: 'Instagram Likes [Fast]', rate: 0.80 },
    { id: 3, name: 'Instagram Views [Instant]', rate: 0.10 }
  ]
};
