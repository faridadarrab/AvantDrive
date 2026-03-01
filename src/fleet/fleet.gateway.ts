import { WebSocketGateway, WebSocketServer, SubscribeMessage } from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { OnEvent } from '@nestjs/event-emitter';
import { GpsLog } from '@prisma/client';

@WebSocketGateway({ namespace: '/fleet' })
export class FleetGateway {
  @WebSocketServer()
  server: Server;

  @SubscribeMessage('subscribe_gps')
  handleSubscribeGps(client: Socket, payload: { companyScope: string; scope: string; vehicleId?: string }) {
    // For the sake of the requirements, depending on user scope
    if (payload.scope === 'OWN' && payload.vehicleId) {
      client.join(`vehicle_${payload.vehicleId}`);
    } else {
      client.join(`company_${payload.companyScope}`);
    }
    return { event: 'subscribed', data: 'OK' };
  }

  @OnEvent('vehicle.location.update')
  handleLocationUpdate(log: GpsLog) {
    // Emissions to rooms
    this.server.to(`company_${log.companyScope}`).emit('vehicle.location.update', log);
    this.server.to(`vehicle_${log.vehicleId}`).emit('vehicle.location.update', log);
  }
}
