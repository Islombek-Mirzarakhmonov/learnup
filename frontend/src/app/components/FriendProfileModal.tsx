import InteractiveModal from "./InteractiveModal";

type FriendProfileModalProps = {
  open: boolean;
  friend: {
    ism: string;
    sinf: string;
    daraja: number;
    xp: number;
    faoliyat: string;
  };
  onClose: () => void;
};

export default function FriendProfileModal({ open, friend, onClose }: FriendProfileModalProps) {
  return (
    <InteractiveModal
      open={open}
      title={friend.ism}
      subtitle="Profil ma'lumotlari"
      onClose={onClose}
      footer={
        <button onClick={onClose} className="w-full rounded-2xl bg-teal-600 px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-teal-700">
          Yopish
        </button>
      }
    >
      <div className="space-y-4">
        <div className="rounded-2xl bg-teal-50 p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-teal-400 to-teal-600 font-bold text-white">
              {friend.ism.split(" ").map((n) => n[0]).join("").slice(0, 2)}
            </div>
            <div>
              <p className="font-bold text-gray-900">{friend.ism}</p>
              <p className="text-sm text-gray-500">{friend.sinf} • Daraja {friend.daraja}</p>
            </div>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-2xl bg-gray-50 p-3">
            <p className="text-xs text-gray-400">XP</p>
            <p className="text-lg font-bold text-gray-900">{friend.xp.toLocaleString()}</p>
          </div>
          <div className="rounded-2xl bg-gray-50 p-3">
            <p className="text-xs text-gray-400">Faoliyat</p>
            <p className="text-sm font-semibold text-gray-700">{friend.faoliyat}</p>
          </div>
        </div>
      </div>
    </InteractiveModal>
  );
}
