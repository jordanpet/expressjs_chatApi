import 'dart:convert';
import 'package:flutter/foundation.dart';
import 'package:socket_io_client/socket_io_client.dart' as IO;


class SocketManager {
  static final SocketManager sigleton = SocketManager._internal();
  SocketManager._internal();

  IO.Socket? socket;
  static SocketManager get shared => sigleton;

  void initSocket() {
    this.socket = IO.io('http://localhost:3004/', <String, dynamic>{
      'transports': ['websocket'],
      'autoConnect': true
    });

    socket?.on("connect", (data) {
      if (kDebugMode) {
        print("Socket connect done");
      }
      updateSocketApi();
    });
    socket?.on("connect_error", (data) {
      if (kDebugMode) {
        print("Socket connect_error");
        print(data);
      }
    });

    socket?.on("error", (data) {
      if (kDebugMode) {
        print("Socket error");
        print(data);
      }
    });

    socket?.on("updateSocket", (data) {
      if (kDebugMode) {
        print("Socket updateSocket--------------------");
        print(data);
      }
    });

    socket?.on("disconnect", (data) {
      if (kDebugMode) {
        print("Socket disconnect");
        print(data);
      }
    });

    socket?.on("some_event", (data) {
      if (kDebugMode) {
        print("Received some_event: $data");
      }
    });
  }

  Future updateSocketApi() async {
    try {
      socket?.emit("updateSocket", jsonEncode({"user_id": ":"}));
    } catch (err) {
      if (kDebugMode) {
        print(err);
      }
    }
  }
}
