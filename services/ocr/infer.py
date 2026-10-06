import os,sys,json,contextlib
os.environ['PADDLE_PDX_DISABLE_MODEL_SOURCE_CHECK']='True'
os.environ['OMP_NUM_THREADS']='4'
# Paddle logs stay off the structured result stream.
with contextlib.redirect_stdout(sys.stderr):
 from paddleocr import PaddleOCR
 ocr=PaddleOCR(lang='th',ocr_version='PP-OCRv5',device='cpu',use_doc_orientation_classify=False,use_doc_unwarping=False,use_textline_orientation=False,text_detection_model_name='PP-OCRv5_mobile_det',text_recognition_model_name='th_PP-OCRv5_mobile_rec',enable_mkldnn=False,cpu_threads=4)
 output=list(ocr.predict(sys.argv[1]))
 item=output[0].json
 if isinstance(item,str):item=json.loads(item)
 if 'res' in item:item=item['res']
print(json.dumps({'text':'\n'.join(item.get('rec_texts',[]))},ensure_ascii=False))