import importlib.util
import json
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path

import cv2
import numpy as np
import pymupdf
from PIL import Image,ImageDraw

spec=importlib.util.spec_from_file_location('media_worker',Path(__file__).parents[1]/'scripts/media-worker.py')
worker=importlib.util.module_from_spec(spec);spec.loader.exec_module(worker)


class MediaTests(unittest.TestCase):
    def test_region_validation(self):
        for regions in ([],[[0,0,1,1]],[[-.1,0,.1,.1]],[[0,0,float('nan'),.1]]):
            with self.assertRaises(ValueError):worker.rects(regions,100,100)

    def test_link_allowlist(self):
        for url in ('http://127.0.0.1/a','https://example.com/file.mp4','https://www.youtube.com.evil.test/watch?v=BaW_jenozKc','https://user:pass@youtube.com/watch?v=BaW_jenozKc','https://youtube.com/playlist?list=x','https://youtube.com:8080/watch?v=BaW_jenozKc'):
            with self.assertRaises(ValueError):worker.validate_url(url)
        for url in ('https://www.youtube.com/watch?v=BaW_jenozKc','https://youtu.be/BaW_jenozKc','https://instagram.com/reel/Test123/','https://www.facebook.com/watch/?v=1234567'):
            self.assertEqual(worker.validate_url(url),url)

    def test_image_inpainting_preserves_dimensions_and_alpha(self):
        with tempfile.TemporaryDirectory() as d:
            src=Path(d)/'input.png';dest=Path(d)/'output.png'
            im=Image.new('RGBA',(320,240),(50,100,140,255));ImageDraw.Draw(im).rectangle((250,190,279,209),fill='white');im.save(src)
            worker.clean_image({'input':str(src),'output':str(dest),'regions':[[.775,.78,.11,.11]]})
            out=Image.open(dest);self.assertEqual(out.size,(320,240));self.assertEqual(out.mode,'RGBA')
            self.assertLess(sum(abs(a-b) for a,b in zip(out.getpixel((265,200))[:3],(50,100,140))),25)

    def test_pdf_keeps_other_pages_and_dimensions(self):
        with tempfile.TemporaryDirectory() as d:
            src=Path(d)/'input.pdf';dest=Path(d)/'output.pdf'
            pdf=pymupdf.open();p=pdf.new_page(width=320,height=240);p.insert_text((250,210),'LOGO');p=pdf.new_page(width=400,height=500);p.insert_text((40,50),'KEEP TEXT');pdf.save(src);pdf.close()
            worker.clean_pdf({'input':str(src),'output':str(dest),'regions':[[.75,.75,.2,.18]],'page':0,'allPages':False})
            with pymupdf.open(dest) as out:
                self.assertEqual(len(out),2);self.assertEqual(out[0].rect.width,320);self.assertEqual(out[0].rect.height,240)
                self.assertIn('KEEP TEXT',out[1].get_text());self.assertNotIn('LOGO',out[0].get_text())

    def test_video_inpainting_preserves_frames_size_and_audio(self):
        with tempfile.TemporaryDirectory() as d:
            src=Path(d)/'in.mp4';dest=Path(d)/'out.mp4'
            subprocess.run([worker.ffmpeg(),'-hide_banner','-loglevel','error','-y','-f','lavfi','-i','color=c=0x32648c:s=320x240:r=12:d=1','-f','lavfi','-i','sine=frequency=440:duration=1','-vf','drawbox=x=250:y=190:w=30:h=20:color=white:t=fill','-c:v','libx264','-pix_fmt','yuv420p','-c:a','aac','-shortest',str(src)],check=True,timeout=30)
            worker.clean_video({'input':str(src),'output':str(dest),'regions':[[.775,.78,.11,.11]]})
            cap=cv2.VideoCapture(str(dest));self.assertEqual(int(cap.get(cv2.CAP_PROP_FRAME_WIDTH)),320);self.assertEqual(int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT)),240);self.assertEqual(int(cap.get(cv2.CAP_PROP_FRAME_COUNT)),12);ok,frame=cap.read();cap.release();self.assertTrue(ok)
            self.assertLess(int(frame[200,265].mean()),180)
            result=subprocess.run([worker.ffmpeg(),'-hide_banner','-i',str(dest),'-map','0:a:0','-f','null','-'],stdout=subprocess.DEVNULL,stderr=subprocess.PIPE,timeout=20)
            self.assertEqual(result.returncode,0)


if __name__=='__main__':unittest.main()
