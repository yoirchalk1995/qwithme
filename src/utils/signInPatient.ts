import { prisma } from "../db/prisma";
import { setUser } from "../sockets/store";
import { getIO } from "../startup/sockets";
import { CustomError } from "./CustomError";

export default async function (
  staffId: number,
  patientId: number,
  socketId: string
) {
  const patient = await prisma.patients.findUnique({
    where: {
      id: patientId,
    },
  });

  if (!patient)
    throw new CustomError(404, `patient with id ${patientId} not found`);

  const staff = await prisma.staff.findUnique({
    where: {
      id: staffId,
    },
  });

  if (!staff) {
    throw new CustomError(404, `staff with id ${patientId} not found`);
  }

  const roomId = await prisma.staff_rooms.findFirst({
    where: {
      staff_id: staffId,
    },
    select: {
      room_id: true,
    },
  });

  if (!roomId) {
    const io = getIO();
    const socket = io.sockets.sockets.get(socketId);
    socket?.emit(
      "joined_que",
      "Your staff member hasn't been allocated a room. \n Please try again later or contact reception."
    );
    throw new CustomError(404, `no room allocated to staff with id ${staffId}`);
  }

  const prevQueNumber = await prisma.ques.count();

  const que = await prisma.ques.create({
    data: {
      patient_id: patientId,
      staff_id: staffId,
      room_id: roomId.room_id,
      queue_number: prevQueNumber + 1,
    },
  });

  return que;
}
