import Card from "../../../shared/components/Card";
import type {

    SearchResult

} from "../types/SearchResult";

interface Props{

    result:
        SearchResult;

}

export default function SearchResultCard({

    result

}:Props){

    return(

        <Card>

            <img

                src={result.thumbnail}

                alt={result.title}

                className="
                    h-20
                    w-32
                    rounded-lg
                    object-cover
                "

            />

            <div
                className="
                    flex-1
                "
            >

                <h3
                    className="
                        line-clamp-2
                        font-semibold
                    "
                >

                    {result.title}

                </h3>

                <p
                    className="
                        mt-2
                        text-sm
                        text-gray-500
                    "
                >

                    {result.channel}

                </p>

                <p
                    className="
                        text-xs
                        text-gray-400
                    "
                >

                    {result.duration}

                </p>

            </div>

        </Card>

    );

}