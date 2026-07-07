export class HealthService {


    getStatus(){

        return {

            status:"OK",

            timestamp:
                Date.now()

        };

    }


}