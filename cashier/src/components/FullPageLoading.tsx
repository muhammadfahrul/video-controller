interface FullPageLoadingProps {
  isLoading: boolean;
  message?: string;
}

export function FullPageLoading({ isLoading, message = 'Memuat...' }: FullPageLoadingProps) {
  if (!isLoading) return null;
  
  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex flex-col items-center justify-center">
      <div className="w-12 h-12 border-4 border-purple-500 border-t-transparent rounded-full animate-spin" />
      <p className="text-white text-sm mt-4">{message}</p>
    </div>
  );
}
