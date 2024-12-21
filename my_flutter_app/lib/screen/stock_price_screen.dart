import 'package:flutter/material.dart';
import 'package:socket_io_client/socket_io_client.dart' as IO;

class StockPriceScreen extends StatefulWidget {
  @override
  _StockPriceScreenState createState() => _StockPriceScreenState();
}

class _StockPriceScreenState extends State<StockPriceScreen> {
  IO.Socket? socket;
  String stockPrice = 'Loading...';

  @override
  void initState() {
    super.initState();
    initSocket();
  }

  void initSocket() {
    socket = IO.io('http://192.168.x.x:3004', {
      'transports': ['websocket'],
      'autoConnect': true,
    });

    socket?.on('stock_price_update', (data) {
      setState(() {
        stockPrice = 'Price: \$${data['price']}';
      });
    });
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: Text('Live Stock Prices')),
      body: Center(
        child: Text(
          stockPrice,
          style: TextStyle(fontSize: 24),
        ),
      ),
    );
  }

  @override
  void dispose() {
    socket?.dispose();
    super.dispose();
  }
}
