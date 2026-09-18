import jwt, { SignOptions } from 'jsonwebtoken';
import { IUser } from '../models/User';

export const generateAccessToken = (user: IUser): string => {
  const options: SignOptions = {
    expiresIn: (process.env.JWT_ACCESS_EXPIRES_IN || '15m') as SignOptions['expiresIn'],
  };
  return jwt.sign(
    { id: user._id, role: user.role },
    process.env.JWT_ACCESS_SECRET as string,
    options
  );
};

export const generateRefreshToken = (user: IUser): string => {
  const options: SignOptions = {
    expiresIn: (process.env.JWT_REFRESH_EXPIRES_IN || '7d') as SignOptions['expiresIn'],
  };
  return jwt.sign(
    { id: user._id },
    process.env.JWT_REFRESH_SECRET as string,
    options
  );
};

export const verifyRefreshToken = (token: string): { id: string } => {
  return jwt.verify(token, process.env.JWT_REFRESH_SECRET as string) as { id: string };
};