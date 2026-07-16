import { useNavigate } from "react-router-dom";

import { useAppStore } from "../../store/appStore";

interface Props {

    to: string;

    children: React.ReactNode;

    className?: string;

}

export default function MenuLink({

    to,

    children,

    className = ""

}: Props) {

    const navigate = useNavigate();

    const setGlobalLoading = useAppStore((state)=>state.setGlobalLoading);

    const handleClick = (e: React.MouseEvent) => {

        e.preventDefault();

        setGlobalLoading(true);

        // Small delay to show loading before navigation
        setTimeout(() => {

            navigate(to);

            setTimeout(() => setGlobalLoading(false), 300);

        }, 100);

    };

    return (

        <a
            href={to}
            onClick={handleClick}
            className={className}
        >

            {children}

        </a>

    );

}
