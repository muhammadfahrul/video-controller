export type LoadingMessage = 
  | 'loading'           // Default loading
  | 'connecting'        // Connecting to server
  | 'activating'        // Activating a room
  | 'deactivating'     // Deactivating a room
  | 'extending'         // Extending time
  | 'cleaning'          // Marking room as cleaned
  | 'moving'            // Moving room
  | 'paying'            // Processing payment
  | 'saving'            // Saving data
  | 'deleting'          // Deleting data
  | 'clearing';         // Clearing data

interface FullPageLoadingProps {
  isLoading: boolean;
  message?: string;
  type?: LoadingMessage;
}

// Loading messages based on type
const loadingMessages: Record<LoadingMessage, string> = {
  loading: 'Memuat data...',
  connecting: 'Menghubungkan ke server...',
  activating: 'Mengaktifkan ruangan...',
  deactivating: 'Menonaktifkan ruangan...',
  extending: 'Memperpanjang waktu...',
  cleaning: 'Menandai ruangan bersih...',
  moving: 'Memindahkan ruangan...',
  paying: 'Memproses pembayaran...',
  saving: 'Menyimpan data...',
  deleting: 'Menghapus data...',
  clearing: 'Menghapus semua data...',
};

// Duration for each type (in ms)
export const loadingDurations: Record<LoadingMessage, number> = {
  loading: 5000,           // Default: wait for data (with 5s timeout)
  connecting: 10000,       // Connecting: 10s for socket connection
  activating: 5000,        // Activating: 3s + buffer
  deactivating: 5000,       // Deactivating: 3s + buffer
  extending: 5000,         // Extending: 3s + buffer
  cleaning: 3000,          // Cleaning: quick operation
  moving: 5000,            // Moving: 3s + buffer
  paying: 3000,            // Payment processing
  saving: 3000,            // Saving: quick operation
  deleting: 3000,          // Deleting: quick operation
  clearing: 3000,          // Clearing: quick operation
};

export function FullPageLoading({ isLoading, message, type = 'loading' }: FullPageLoadingProps) {
  const displayMessage = message || loadingMessages[type];
  
  if (!isLoading) return null;
  
  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex flex-col items-center justify-center">
      <div className="w-12 h-12 border-4 border-purple-500 border-t-transparent rounded-full animate-spin" />
      <p className="text-white text-sm mt-4">{displayMessage}</p>
    </div>
  );
}
