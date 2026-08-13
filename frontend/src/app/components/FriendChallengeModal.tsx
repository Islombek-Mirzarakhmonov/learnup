import InteractiveModal from "./InteractiveModal";

type FriendChallengeModalProps = {
  open: boolean;
  friend: {
    ism: string;
  };
  value: string;
  onChange: (value: string) => void;
  onClose: () => void;
  onSubmit: () => void;
};

export default function FriendChallengeModal({ open, friend, value, onChange, onClose, onSubmit }: FriendChallengeModalProps) {
  return (
    <InteractiveModal
      open={open}
      title={`Musobaqa • ${friend.ism}`}
      subtitle="Do‘stingiz bilan yangi musobaqa boshlang"
      onClose={onClose}
      footer={
        <div className="flex gap-3">
          <button onClick={onClose} className="flex-1 rounded-2xl border border-gray-200 px-4 py-3 text-sm font-semibold text-gray-600">Bekor qilish</button>
          <button onClick={onSubmit} className="flex-1 rounded-2xl bg-orange-500 px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-orange-600">Taklif yuborish</button>
        </div>
      }
    >
      <div className="space-y-3">
        <div className="rounded-2xl bg-orange-50 p-3 text-sm text-orange-700">
          {friend.ism} bilan musobaqa boshlashingiz mumkin.
        </div>
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          rows={4}
          className="w-full rounded-xl border border-gray-200 px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
          placeholder="Masalan: 15 daqiqa tez yozish musobaqasi"
        />
      </div>
    </InteractiveModal>
  );
}
