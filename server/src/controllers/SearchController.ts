import {

    Request,

    Response

} from "express";

import {

    YoutubeSearchService

} from "../youtube/YoutubeSearchService";

export class SearchController {

    private youtube =

        new YoutubeSearchService();

    search = async (

        req:Request,

        res:Response

    )=>{

        try{

            const keyword =

                String(

                    req.query.q ?? ""

                );

            const result =

                await this.youtube.search(

                    keyword

                );

            res.json(result);

        }

        catch(err){

            console.error(err);

            res.status(500).json({

                message:"Search failed"

            });

        }

    }

}