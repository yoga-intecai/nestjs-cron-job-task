import {Injectable, Logger} from '@nestjs/common';
import {Cron} from '@nestjs/schedule';

@Injectable()
export class CronService{
    private readonly logger = new Logger(CronService.name);

    @Cron('*/10 * * * * *')
    handleCron(){
        this.logger.log('Cron job is running every 10 seconds');
    }
}
