import { NextRequest, NextResponse } from 'next/server';
import { 
  getChatsAction, 
  getMessagesAction, 
  getSessionStatusAction,
  sendMessageAction 
} from '@/app/actions/whatsapp';

// Test endpoint untuk load testing WhatsApp server actions
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const testType = searchParams.get('type') || 'chats';
    const chatId = searchParams.get('chatId') || 'test-chat-id';
    const message = searchParams.get('message') || 'Test message';

    let result;
    
    switch (testType) {
      case 'chats':
        result = await getChatsAction();
        break;
      case 'messages':
        result = await getMessagesAction(chatId);
        break;
      case 'sessions':
        result = await getSessionStatusAction();
        break;
      case 'send-message':
        result = await sendMessageAction(chatId, message);
        break;
      default:
        return NextResponse.json(
          { error: 'Invalid test type' },
          { status: 400 }
        );
    }

    // Return response sesuai dengan hasil server action
    if (result && 'success' in result && result.success) {
      return NextResponse.json({
        success: true,
        data: result,
        timestamp: new Date().toISOString()
      });
    } else {
      const errorMessage = result && 'error' in result && result.error 
        ? result.error 
        : 'Unknown error';
      return NextResponse.json(
        { 
          success: false, 
          error: errorMessage,
          timestamp: new Date().toISOString()
        },
        { status: 500 }
      );
    }

  } catch (error) {
    console.error('WhatsApp test endpoint error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Internal server error',
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    );
  }
}