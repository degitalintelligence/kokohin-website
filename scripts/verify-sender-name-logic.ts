import { getGroupSenderLabel } from '../src/app/admin/whatsapp/utils/message';
import { Message } from '../src/app/admin/whatsapp/components/web-client/types';

// Mock payload based on debug output
const mockPayload = {
  id: 'false_120363021896110365@g.us_3EB0...',
  from: '120363021896110365@g.us',
  to: '62895360932098@c.us',
  author: undefined, // Top level author was undefined in log
  pushname: 'Hawra Tustari', // Top level pushname existed in log
  notifyName: undefined, // Top level notifyName was undefined in log
  _data: {
    id: {
      fromMe: false,
      remote: '120363021896110365@g.us',
      id: '3EB0...',
      participant: '628123456789@c.us',
      _serialized: 'false_120363021896110365@g.us_3EB0...'
    },
    notifyName: 'Hawra Tustari', // Nested notifyName existed
    senderName: 'Hawra Tustari',
    author: '628123456789@c.us'
  }
};

const mockMessage: Message = {
  id: 'test-id',
  external_message_id: 'ext-id',
  chat_id: '120363021896110365@g.us',
  body: 'Test message',
  type: 'chat',
  direction: 'inbound',
  sender_type: 'customer',
  status: 'delivered',
  sent_at: new Date().toISOString(),
  raw_payload: mockPayload
};

console.log('Testing getGroupSenderLabel...');
const label = getGroupSenderLabel(mockMessage);
console.log('Result:', label);

if (label === 'Hawra Tustari') {
  console.log('SUCCESS: Correctly extracted sender name from nested _data');
} else {
  console.log('FAILURE: Expected "Hawra Tustari", got:', label);
}
