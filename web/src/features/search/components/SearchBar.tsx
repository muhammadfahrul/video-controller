import {

    Search

} from "lucide-react";

interface Props {

    value: string;

    onChange(
        value: string
    ): void;

    onSearch(): void;

}

export default function SearchBar({

    value,

    onChange,

    onSearch

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

                onChange={e =>

                    onChange(
                        e.target.value
                    )

                }

                onKeyDown={e => {

                    if (e.key === "Enter") {

                        onSearch();

                    }

                }}

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

            <button

                onClick={onSearch}

                className="
                    absolute
                    right-2
                    top-1/2
                    -translate-y-1/2
                    rounded-lg
                    bg-red-600
                    px-4
                    py-2
                    text-sm
                    text-white
                    hover:bg-red-700
                "

            >

                Search

            </button>

        </div>

    );

}