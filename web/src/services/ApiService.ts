import {

    api

} from "../api/client";

export class ApiService {

    async get<T>(
        url:string
    ){

        const response =

            await api.get<T>(
                url
            );

        return response.data;

    }

    async post<T>(

        url:string,

        body:unknown

    ){

        const response =

            await api.post<T>(
                url,
                body
            );

        return response.data;

    }

}