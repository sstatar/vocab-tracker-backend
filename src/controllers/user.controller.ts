import { Request, Response } from "express";
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

export interface AuthRequest extends Request {
    userId?: string;
}

export const getProfile = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const userId = req.userId;
        if (!userId) {
            res.status(401).json({ message: "Unauthorized" });
            return;
        }

        const user = await prisma.user.findUnique({
            where: { id: userId },
            select: {
                id: true,
                email: true,
                name: true,
                dailyGoal: true,
                currentStreak: true,
                createdAt: true,
            },
        });

        if (!user) {
            res.status(404).json({ message: "User not found" });
            return;
        }

        res.status(200).json(user);
    } catch (error) {
        console.error("Error fetching profile:", error);
        res.status(500).json({ message: "Internal server error" });
    }
};

export const updateProfile = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const userId = req.userId;

        if (!userId) {
            res.status(401).json({ message: "Unauthorized" });
            return;
        }

        const { name, dailyGoal } = req.body;

        const updateData: any = {};

        if (name !== undefined) {
            updateData.name = name;
        }

        if (dailyGoal !== undefined) {
            const parsedGoal = Number(dailyGoal);
            if (parsedGoal > 0) {
                updateData.dailyGoal = parsedGoal;
            }
        }

        if (Object.keys(updateData).length === 0) {
            res.status(400).json({ message: "No valid data provided for update." });
            return;
        }

        const updatedUser = await prisma.user.update({
            where: { id: userId },
            data: updateData,
            select: {
                id: true,
                email: true,
                name: true,
                dailyGoal: true,
                currentStreak: true,
            },
        });

        res.status(200).json({
            message: "Profile updated successfully",
            user: updatedUser
        });

    } catch (error) {
        console.error("Error updating profile:", error);
        res.status(500).json({ message: "Internal server error" });
    }
};

export const changePassword = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const userId = req.userId;
        const { oldPassword, newPassword } = req.body;

        if (!userId) {
            res.status(401).json({ message: "Unauthorized" });
            return;
        }

        if (!oldPassword || !newPassword) {
            res.status(400).json({ message: "Both old and new passwords are required" });
            return;
        }

        const user = await prisma.user.findUnique({ where: { id: userId } });
        if (!user) {
            res.status(404).json({ message: "User not found" });
            return;
        }

        const isMatch = await bcrypt.compare(oldPassword, user.password);
        if (!isMatch) {
            res.status(400).json({ message: "Invalid old password" });
            return;
        }

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(newPassword, salt);

        await prisma.user.update({
            where: { id: userId },
            data: { password: hashedPassword },
        });

        res.status(200).json({ message: "Password updated successfully" });
    } catch (error) {
        console.error("Error changing password:", error);
        res.status(500).json({ message: "Internal server error" });
    }
};