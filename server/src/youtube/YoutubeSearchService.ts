import {

    google

} from "googleapis";

import type {

    SearchResult

} from "../types/SearchResult";

import { DurationFormatter } from "./DurationFormatter"

export class YoutubeSearchService {

    async search(

        keyword:string

    ):Promise<SearchResult[]>{

        const youtube = google.youtube({

            version: "v3",

            auth: process.env.YOUTUBE_API_KEY

        });

        const response =
            await youtube.search.list({

                key: process.env.YOUTUBE_API_KEY,

                part: ["snippet"],

                q: keyword,

                type: ["video"],

                maxResults: 20

            });

        const ids =
            response.data.items
                ?.map(
                    item => item.id?.videoId
                )
                .filter(Boolean)
                .join(",");

        const durationResponse =
            await youtube.videos.list({

                key:
                    process.env.YOUTUBE_API_KEY,

                part:[
                    "contentDetails"
                ],

                id:[
                    ids!
                ]

            });

        const durationMap =
            new Map(

                durationResponse.data.items
                    ?.map(item => [

                        item.id,

                        DurationFormatter.format(

                            item.contentDetails
                                ?.duration ??

                            "PT0S"

                        )

                    ])

            );

        return (

            response.data.items ??

            []

        ).map(item => ({

            videoId:
                item.id?.videoId ?? "",

            title:
                item.snippet?.title ?? "",

            channel:
                item.snippet?.channelTitle ?? "",

            thumbnail:

                item.snippet
                    ?.thumbnails
                    ?.high
                    ?.url

                ??

                item.snippet
                    ?.thumbnails
                    ?.default
                    ?.url

                ??

                "",

            duration:

                durationMap.get(

                    item.id?.videoId ?? ""

                ) ??

                "0:00"

        }));

    }

}