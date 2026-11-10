# Rung Chuông Vàng – bản quét thẻ

Chương trình chạy hoàn toàn trong trình duyệt. Không cần cài gì, không cần máy chủ riêng.

## Cách đưa lên web

**Netlify Drop (nhanh nhất)** – mở https://app.netlify.com/drop rồi kéo thả cả thư mục này vào.

**GitHub Pages** – tạo repository công khai, tải cả thư mục lên, vào Settings → Pages,
chọn branch `main`, thư mục `/ (root)`, Save.

Phải chạy trên HTTPS, vì trình duyệt chỉ cho dùng camera trên HTTPS.
Mở trực tiếp file `index.html` từ máy thì camera và việc ghép điện thoại sẽ không chạy.

## Chuẩn bị trước giờ thi

1. **Thiết lập** – nhập danh sách thí sinh (mỗi dòng một tên), tên hội thi, logo trường,
   thời gian mỗi câu, số câu khởi động.
2. **Soạn câu hỏi** – mỗi câu có 4 đáp án, chọn đáp án đúng và loại câu
   (thường / cứu trợ / chuông vàng). Công thức toán viết giữa hai dấu `$`, ví dụ `$x^2+1$`.
   Có thể tải ảnh kèm câu hỏi và kèm từng đáp án.
   Nút **Xuất file** lưu ngân hàng câu hỏi ra file `.json` để sao lưu hoặc mang sang máy khác.
3. **Thẻ học sinh** – bấm In thẻ. Mỗi tờ A4 in 4 thẻ. In đậm, dùng giấy không bóng.

## Cách chơi

Màn **Khai mạc** có pháo hoa và danh sách thí sinh. Bấm *Vào thi* để bắt đầu.

Mỗi câu đi qua ba bước:

1. **Thu đáp án** – học sinh xoay thẻ sao cho chữ cái của đáp án mình chọn nằm ở cạnh trên
   rồi giơ lên. Màn hình chỉ hiện số đã quét, chưa hiện đáp án của ai.
2. **Hiện lựa chọn** – bấm *Xong*. Màn hình lật từng ô để hiện chữ cái mỗi em đã chọn,
   vẫn chưa biết đúng sai.
3. **Công bố** – bấm *Công bố đáp án*. Đáp án đúng sáng lên, ô xanh ô đỏ, ai sai thì bị loại.

Nếu một em quét không ra thẻ, bấm vào ô tên em đó để chọn giúp: A → B → C → D → bỏ.

- Còn **một phần ba** số thí sinh ban đầu: mở vòng **Phao Hồi Sinh**, chỉ một lần.
  Các em đã bị loại trả lời lại, đúng thì trở lại cuộc chơi.
- Còn **một** thí sinh: vào câu **Chuông vàng**. Thí sinh có một quyền *Hỏi khán giả*:
  các bạn đã bị loại giơ thẻ bình chọn, màn hình hiện tỉ lệ phần trăm từng đáp án.
- Trả lời đúng câu Chuông vàng thì thắng, sau đó hiện **bảng vinh danh** ba vị trí.

Phím **Space** hoặc **Enter** làm bước tiếp theo. **Esc** đóng hiệu ứng hoặc thoát trình chiếu.

## Quét bằng điện thoại

Vào tab **Chơi** trên máy tính, khung bên phải hiện một **mã QR ghép cặp**.
Mở camera điện thoại, quét mã đó, bấm vào liên kết. Điện thoại mở trang `scan.html`
và nối với màn hình chính.

Trên điện thoại có luôn các nút điều khiển ván chơi (Xong, Công bố, Câu tiếp, Hỏi khán giả),
số đã quét, và danh sách những em chưa quét được – để bạn vừa đi quanh lớp vừa điều khiển.

Kênh nối đi qua máy chủ trung gian miễn phí của PeerJS, nên cần Internet và có thể
đôi lúc không ổn định. Hãy thử trước một lượt.

## Thư viện trong `vendor/`

Tất cả đều nằm sẵn trong thư mục, không gọi ra Internet, nên chương trình chạy được
cả khi mạng trường yếu:

| Thư viện | Dùng để | Giấy phép |
|---|---|---|
| `zxing-reader.js` + `zxing_reader.wasm` | đọc nhiều mã QR trong một ảnh | Apache-2.0 |
| `jsqr.js` | đọc QR dự phòng (một mã mỗi ảnh) | Apache-2.0 |
| `qrcode.js` | tạo mã QR để in thẻ | MIT |
| `peerjs.min.js` | nối điện thoại với màn hình chính | MIT |
| `katex.min.js`, `katex.min.css`, `auto-render.min.js`, `fonts/` | hiển thị công thức toán | MIT |

## Cấu trúc thư mục

```
index.html      màn hình chính
scan.html       trang máy quét cho điện thoại
css/            main.css, effects.css, print.css
js/             bank.js, sound.js, qr.js, cards.js, fx.js, game.js, link.js, app.js
img/            phao.svg, may-bay.svg, chuong-vang.svg, song.svg, logo-mau.svg
data/           cau-hoi-mau.json  (ngân hàng câu hỏi mẫu)
vendor/         các thư viện ở bảng trên
```

## Những điều cần biết

- Hình **TikZ** không được dựng trong trang. Hãy xuất hình ra ảnh PNG hoặc SVG rồi tải lên;
  ô "Mã TikZ gốc" chỉ để lưu lại mã cho lần sau sửa hình.
- Ngân hàng câu hỏi tự lưu trong trình duyệt của máy đó. Đổi máy hoặc xóa dữ liệu trình duyệt
  thì mất, nên hãy **Xuất file** để sao lưu.
- Số thứ tự trong danh sách thí sinh chính là số in trên thẻ. Đã in thẻ rồi thì đừng đổi
  thứ tự danh sách.
