interface Props {

    title: string;

    action?: React.ReactNode;

}

export default function SectionTitle({

    title,

    action

}: Props) {

    return (

        <div
            className="
                mb-4
                flex
                items-center
                justify-between
            "
        >

            <h2
                className="
                    text-lg
                    font-bold
                    text-white
                "
            >

                {title}

            </h2>

            {action}

        </div>

    );

}