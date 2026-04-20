import { SERVICES_DATA, CONFIG } from './api.js';

document.addEventListener('DOMContentLoaded', () => {
  const platformSelect = document.getElementById('platform');
  const serviceSelect = document.getElementById('service');
  const quantityInput = document.getElementById('quantity');
  const priceDisplay = document.getElementById('display-price');
  const orderForm = document.getElementById('smm-order-form');
  const submitBtn = document.getElementById('submit-btn');

  // Modal elements
  const paymentModal = document.getElementById('payment-modal');
  const closeModalBtn = document.getElementById('close-modal');
  const modalPrice = document.getElementById('modal-total-price');
  const modalOrderId = document.getElementById('order-id-placeholder');
  const confirmPaymentBtn = document.getElementById('confirm-payment');

  // Update services when platform changes
  platformSelect.addEventListener('change', () => {
    const platform = platformSelect.value;
    const services = SERVICES_DATA[platform] || [];
    
    // Clear and populate
    serviceSelect.innerHTML = '<option value="" disabled selected>Үйлчилгээ сонгоно уу...</option>';
    services.forEach(s => {
      const option = document.createElement('option');
      option.value = s.id;
      // APPLY MARKUP AND EXCHANGE RATE FOR DISPLAY
      const markedUpRateUSD = s.rate * CONFIG.MARKUP_MULTIPLIER;
      const rateMNT = markedUpRateUSD * CONFIG.EXCHANGE_RATE;
      option.dataset.rate = rateMNT;
      option.textContent = `${s.name} - ${rateMNT.toLocaleString()}₮/1k`;
      serviceSelect.appendChild(option);
    });

    calculatePrice();
  });

  // Calculate price dynamically
  const calculatePrice = () => {
    const selectedOption = serviceSelect.options[serviceSelect.selectedIndex];
    const rate = selectedOption ? parseFloat(selectedOption.dataset.rate) : 0;
    const quantity = parseInt(quantityInput.value) || 0;

    if (rate && quantity) {
      const price = (rate / 1000) * quantity;
      priceDisplay.textContent = `${price.toLocaleString()}₮`;
    } else {
      priceDisplay.textContent = '0₮';
    }
  };

  serviceSelect.addEventListener('change', calculatePrice);
  quantityInput.addEventListener('input', calculatePrice);

  // Send Telegram Notification to Owner
  const sendTelegramNotification = async (orderData) => {
    const { BOT_TOKEN, CHAT_ID } = CONFIG.TELEGRAM;
    if (!BOT_TOKEN || BOT_TOKEN.includes('YOUR_BOT_TOKEN_HERE')) {
      console.warn('Telegram Bot Token not configured!');
      return false;
    }

    const message = `🚀 *ШИНЭ ЗАХИАЛГА ИРЛЭЭ!*\n\n` +
                    `🔹 *Гүйлгээний утга:* ${orderData.id}\n` +
                    `🔹 *Платформ:* ${orderData.platform}\n` +
                    `🔹 *Үйлчилгээ:* ${orderData.serviceName}\n` +
                    `🔹 *Линк:* ${orderData.link}\n` +
                    `🔹 *Тоо:* ${orderData.quantity}\n` +
                    `🔹 *Үнэ:* ${orderData.price}\n\n` +
                    `💳 *Төлбөр шалгаад захиалгыг баталгаажуулна уу!*`;

    try {
      const response = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: CHAT_ID,
          text: message,
          parse_mode: 'Markdown'
        })
      });
      return response.ok;
    } catch (e) {
      console.error('Telegram notification failed:', e);
      return false;
    }
  };

  // Handle form submission to show payment modal
  orderForm.addEventListener('submit', (e) => {
    e.preventDefault();

    const price = priceDisplay.textContent;
    const linkValue = document.getElementById('link').value;
    
    // Extract a handle and create a simpler order ID for the bank transaction
    const handle = linkValue.replace('https://instagram.com/', '').replace('https://tiktok.com/@', '').split('/')[0] || 'User';
    const shortId = Math.random().toString(36).substr(2, 4).toUpperCase();
    const orderId = `${handle} ${shortId}`;

    // Show Modal
    modalPrice.textContent = price;
    modalOrderId.textContent = orderId;
    paymentModal.style.display = 'flex';
  });

  // Close modal
  closeModalBtn.addEventListener('click', () => {
    paymentModal.style.display = 'none';
  });

  // Window click to close modal
  window.addEventListener('click', (e) => {
    if (e.target === paymentModal) {
      paymentModal.style.display = 'none';
    }
  });

  // Confirm payment
  confirmPaymentBtn.addEventListener('click', async () => {
    const serviceName = serviceSelect.options[serviceSelect.selectedIndex].text;
    const link = document.getElementById('link').value;
    const quantity = quantityInput.value;
    const price = priceDisplay.textContent;
    const orderId = modalOrderId.textContent;

    confirmPaymentBtn.textContent = 'Илгээж байна...';
    confirmPaymentBtn.disabled = true;

    // Send Notification to Owner
    const success = await sendTelegramNotification({
      id: orderId,
      platform: platformSelect.value,
      serviceName: serviceName,
      link: link,
      quantity: quantity,
      price: price
    });

    if (success) {
      alert(`✅ Төлбөрийн мэдээлэл илгээгдлээ! Таны захиалгыг шалгаад 5-10 минутын дотор эхлүүлэх болно. Дугаар: ${orderId}`);
    } else {
      alert(`⚠️ Мэдэгдэл илгээхэд алдаа гарлаа. Гэхдээ та төлбөрөө төлсөн бол бид банкаа шалгаад эхлүүлэх болно. Дугаар: ${orderId}`);
    }

    paymentModal.style.display = 'none';
    orderForm.reset();
    calculatePrice();
    confirmPaymentBtn.textContent = 'Төлбөрөө төлсөн';
    confirmPaymentBtn.disabled = false;
  });
});
