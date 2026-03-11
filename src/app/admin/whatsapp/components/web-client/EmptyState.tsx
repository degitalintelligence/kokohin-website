import React, { memo } from 'react';
import { User as UserIcon } from 'lucide-react';

const EmptyState = () => {
    return (
        <div className="flex flex-col items-center justify-center h-full border-b-[6px] border-[#E30613] text-center px-10">
            <div className="mb-10 animate-in zoom-in duration-500">
                <div className="w-[300px] h-[200px] bg-gray-100 dark:bg-[#202c33] rounded-2xl flex items-center justify-center text-[#d1d7db] dark:text-[#374248]">
                     <div className="flex flex-col items-center">
                        <div className="w-16 h-16 rounded-full bg-[#e9edef] dark:bg-[#2a3942] flex items-center justify-center mb-4">
                            <UserIcon size={32} className="text-[#aebac1]" />
                        </div>
                        <p className="text-sm font-medium">Select a chat to start messaging</p>
                     </div>
                </div>
            </div>
            <h1 className="text-[32px] font-light text-[#41525d] dark:text-[#e9edef] mb-5">
                Kokohin WhatsApp Center
            </h1>
            <p className="text-[#667781] dark:text-[#8696a0] text-sm leading-6 max-w-[560px]">
                Send and receive messages without keeping your phone online.<br/>
                Use WhatsApp on up to 4 linked devices and 1 phone.
            </p>
            <div className="mt-10 flex items-center gap-2 text-[#8696a0] text-xs font-medium">
                <div className="w-3 h-3 bg-[#8696a0] rounded-full opacity-30"></div>
                End-to-end encrypted
            </div>
        </div>
    );
};

export default memo(EmptyState);
