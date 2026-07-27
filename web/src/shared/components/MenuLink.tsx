import { Link } from "react-router-dom";

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

    return (

        <Link
            to={to}
            className={className}
        >

            {children}

        </Link>

    );

}
