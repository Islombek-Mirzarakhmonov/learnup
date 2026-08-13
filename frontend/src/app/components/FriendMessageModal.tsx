import InteractiveModal from "./InteractiveModal";

type FriendMessageModalProps = {
  open: boolean;
  friend: {
    ism: string;
  };
  value: string;
  onChange: (value: string) => void;
  onClose: () => void;
  onSubmit: () => void;
};

export default function FriendMessageModal({ open, friend, value, onChange, onClose, onSubmit }: FriendMessageModalProps) {
  return (
    <InteractiveModal
      open={open}
      title={`Xabar • ${friend.ism}`}
      subtitle="Do‘stingizga tezkor xabar yozing"
      onClose={onClose}
      footer={
        <div className="flex gap-3">
          <button onClick={onClose} className="flex-1 rounded-2xl border border-gray-200 px-4 py-3 text-sm font-semibold text-gray-600">Bekor qilish</button>
          <button onClick={onSubmit} className="flex-1 rounded-2xl bg-teal-600 px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-teal-700">Yuborish</button>
        </div>
      }
    >
      <div className="space-y-3">
        <div className="rounded-2xl bg-gray-50 p-3 text-sm text-gray-600">
          {friend.ism} ga xabar yozilmoqda.
        </div>
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          rows={4}
          className="w-full rounded-xl border border-gray-200 px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
          placeholder="Salom, bugun ..."
        />
      </div>
    </InteractiveModal>
  );
}
