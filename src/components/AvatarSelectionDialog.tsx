import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';

interface AvatarSelectionDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (avatarUrl: string) => void;
}

// Generate array of 99 avatars
const AVATAR_OPTIONS = Array.from({ length: 99 }, (_, i) => ({
  id: `avatar${i + 1}`,
  url: `/avatar/avatar${i + 1}.png`
}));

const AvatarSelectionDialog: React.FC<AvatarSelectionDialogProps> = ({
  isOpen,
  onClose,
  onSelect,
}) => {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[720px] max-h-[80vh]">
        <DialogHeader>
          <DialogTitle>Choose Avatar</DialogTitle>
          <DialogDescription>
            Select a new avatar for your profile
          </DialogDescription>
        </DialogHeader>
        <ScrollArea className="h-[500px] pr-4">
          <div className="grid grid-cols-4 sm:grid-cols-5 md:grid-cols-6 gap-4 py-4">
            {AVATAR_OPTIONS.map((avatar) => (
              <Button
                key={avatar.id}
                variant="outline"
                className="h-20 w-20 p-1 flex items-center justify-center hover:border-primary"
                onClick={() => onSelect(avatar.url)}
              >
                <Avatar className="h-full w-full">
                  <AvatarImage src={avatar.url} alt={`Avatar ${avatar.id}`} />
                  <AvatarFallback>...</AvatarFallback>
                </Avatar>
              </Button>
            ))}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
};

export default AvatarSelectionDialog; 