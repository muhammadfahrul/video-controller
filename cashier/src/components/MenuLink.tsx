import { useNavigate } from "react-router-dom";
import { useRoomStore } from "../store/useRoomStore";
import { useTransactionStore } from "../store/useTransactionStore";

interface MenuLinkProps {
  to: string;
  children: React.ReactNode;
  className?: string;
}

export function MenuLink({ to, children, className = "" }: MenuLinkProps) {
  const navigate = useNavigate();
  const setRoomLoading = useRoomStore((state) => state.setLoading);
  const setTransactionLoading = useTransactionStore((state) => state.setLoading);

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    
    // Set loading to true
    console.log('[MenuLink] Setting loading to true, navigating to:', to);
    setRoomLoading(true);
    setTransactionLoading(true);

    // Navigate immediately
    navigate(to);
  };

  return (
    <a
      href={to}
      onClick={handleClick}
      className={className}
      style={{ cursor: 'pointer' }}
    >
      {children}
    </a>
  );
}
