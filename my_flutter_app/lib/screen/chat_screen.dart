
import 'package:flutter/material.dart';
import 'package:my_flutter_app/common/socket_helper.dart';
import 'package:socket_io_client/socket_io_client.dart' as IO;


class ChatScreen extends StatefulWidget {
  @override
  _ChatScreenState createState() => _ChatScreenState();
}

class _ChatScreenState extends State<ChatScreen> {
  IO.Socket? socket;
  TextEditingController controller = TextEditingController();
  List<String> messages = [];

  @override
  void initState() {
    super.initState();
    // Initialize socket connection
    SocketManager.shared.initSocket();

    // Listen for incoming chat messages
    SocketManager.shared.socket?.on("chat_message", (data) {
      setState(() {
        messages.add(data);
      });
    });
  }

  // Method to send a message through the socket
  void sendMessage(String message) {
    if (socket != null) {
      socket?.emit("chat_message", message);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: Text("Chat Screen"),
      ),
      body: Column(
        children: <Widget>[
          Expanded(
            child: ListView.builder(
              itemCount: messages.length,
              itemBuilder: (context, index) {
                return ListTile(
                  title: Text(messages[index]),
                );
              },
            ),
          ),
          Padding(
            padding: const EdgeInsets.all(8.0),
            child: Row(
              children: <Widget>[
                Expanded(
                  child: TextField(
                    controller: controller,
                    decoration: InputDecoration(hintText: 'Enter message'),
                  ),
                ),
                IconButton(
                  icon: Icon(Icons.send),
                  onPressed: () {
                    sendMessage(controller.text);  // Send message
                    controller.clear();  // Clear input field
                  },
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  @override
  void dispose() {
    SocketManager.shared.socket?.dispose();  // Close the socket connection when the widget is disposed
    super.dispose();
  }
}
