import { Router, type IRouter } from "express";
import healthRouter from "./health";
import wiithubRouter from "./wiithub";

const router: IRouter = Router();

router.use(healthRouter);
router.use(wiithubRouter);

export default router;
