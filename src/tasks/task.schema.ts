import {Prop, Schema, SchemaFactory} from '@nestjs/mongoose';
import{ HydratedDocument } from 'mongoose';

export type TaskDocument= HydratedDocument<Task>;

@Schema({ timestamps: true})
export class Task{
    @Prop({required: true})
    title: string;

    @Prop({
        enum: ['Pending', 'In Progress', 'Expired'],
        default: 'Pending',
    })
    status:string;

    @Prop({required: true})
    expiresAt: Date;
}

export const TaskSchema= SchemaFactory.createForClass(Task);