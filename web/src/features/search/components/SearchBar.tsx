import {

    Search

} from "lucide-react";

interface Props {

    value: string;

    onChange(
        value:string
    ):void;

}

export default function SearchBar({

    value,

    onChange

}:Props){

    return(

        <div
            className="
                relative
            "
        >

            <Search
                size={18}
                className="
                    absolute
                    left-4
                    top-1/2
                    -translate-y-1/2
                    text-gray-400
                "
            />

            <input

                value={value}

                onChange={e=>

                    onChange(
                        e.target.value
                    )

                }

                placeholder="Search YouTube..."

                className="
                    w-full
                    rounded-xl
                    border
                    py-3
                    pl-11
                    pr-4
                    outline-none

                    focus:border-red-500
                "

            />

        </div>

    );

}