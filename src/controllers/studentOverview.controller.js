import { getDashboardOverview } from "../services/studentOverview.service.js";

export const getOverview = async (req, res, next) => {
    try {
        const data = await getDashboardOverview(req.user.id);
        res.status(200).json({ success: true, ...data });
    } catch (err) {
        next(err);
    }
};