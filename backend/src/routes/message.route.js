import express from "express";
import { protectRoute } from "../middleware/auth.middleware.js";
import {
  getUsersForSidebar,
  getConversationsForSidebar,
  getMessages,
  sendMessages,
} from "../controllers/message.controller.js";
import { upload } from "../middleware/upload.middleware.js";
const router = express.router();

router.use(protectRoute);

router.get("/users", getUsersForSidebar);
router.get("/conversations", getConversationsForSidebar);
router.get("/:id", getMessages);
router.post("/send/:id", upload.single("media"), sendMessages);

export default router;
