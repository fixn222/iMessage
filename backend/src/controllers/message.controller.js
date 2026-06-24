import Message from "../models/message.model.js";
import User from "../models/user.model.js";
import { hasImageKitConfig, uploadChatMedia } from "../lib/imageKit.js";
import { getReceiverSocketId, io } from "../lib/socket.js";
export async function getUsersForSidebar(req, res) {
  try {
    const loggedInUserId = req.user._id;

    const fillteredUsers = await User.find({
      _id: { $ne: loggedInUserId },
    }).select("-clerkId");

    res.status(200).json(fillteredUsers);
  } catch (error) {
    console.error("Error in getUsersForSidebar:", error.message);
    res.status(500).json({ message: "Internal Server error" });
  }
}
export async function getConversationsForSidebar(req, res) {
  try {
    const loggedInUserId = req.user._id;

    const conversations = await Message.aggregate([
      //1 Keep only the messagess I sent or recived .
      {
        $match: {
          $or: [{ senderId: loggedInUserId }, { receiverId: loggedInUserId }],
        },
      },
      {
        $group: {
          //the partner is the other persion on the message not me
          _id: {
            $cond: [
              { $eq: ["$senderId", loggedInUserId] },
              "$receiverId",
              "senderId",
            ],
          },
          lastMessageAt: { $max: "$createdAt" },
        },
      },
      { $sort: { lastMessageAt: -1 } },
      {
        $lookup: {
          from: "users",
          localField: "_id",
          foreignField: "_id",
          as: "user",
        },
      },
      { $replaceRoot: { newRoot: { $first: "$user" } } },
      { $project: { clerkId: 0 } },
    ]);

    res.status(200).json(conversations);
  } catch (error) {
    console.log("Error in getConversationsForSidebar", error.message);
    res.status(500).json({ message: "Internal Server error" });
  }
}
export async function getMessages(req, res) {
  try {
    const { id: userToChatId } = req.params;
    const myId = req.user._id;

    const messages = await Message.find({
      $or: [
        { senderId: myId, receiverId: userToChatId },
        { senderId: userToChatId, receiverId: myId },
      ],
    }).sort({ createdAt: 1 });

    res.status(200).json(messages);
  } catch (error) {
    console.error("Error in getMessages : ", error.message);
    res.status(500).json({ message: "Internal Server error" });
  }
}
export async function sendMessages(req, res) {
  try {
    const { text } = req.body;
    const { id: receiverId } = req.params;
    const senderId = req.user._id;

    let imageUrl;
    let vidoeUrl;

    if (req.file) {
      if (!hasImageKitConfig) {
        return res
          .status(500)
          .json({ message: "media upload is not configured " });
      }

      const url = await uploadChatMedia(req.file);

      if (req.file.mimetype.startsWith("vidoe/")) vidoeUrl = url;
      else imageUrl = url;

      const newMessage = new Mesaage({
        senderId,
        receiverId,
        text,
        image: imageUrl,
        video: vidoeUrl,
      });
      await newMessage.save();

      const reciverSocketId = getReceiverSocketId(receiverId);
      //only send the message in realtime if user is online
      if (reciverSocketId) {
        io.to(reciverSocketId).emit("newMessage", newMessage);
      }

      res.status(201).json(newMessage);
    }
  } catch (error) {
    console.error("Error in sendMessages : ", error.message);
    res.status(500).json({ message: "Internal Server error" });
  }
}
