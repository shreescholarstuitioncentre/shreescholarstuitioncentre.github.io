import matplotlib; matplotlib.use('Agg')
import matplotlib.pyplot as plt, numpy as np, math, os
from matplotlib.patches import Polygon, Rectangle, Circle, Wedge
os.makedirs('figs',exist_ok=True)
C='#1a3d7c'; R='#b03030'; FILL='#dde8f7'
class F:
    def __init__(s,name,w=2.6,h=2.8):
        s.name=name; s.fig,s.ax=plt.subplots(figsize=(w,h),dpi=170); s.ax.set_aspect('equal'); s.ax.axis('off')
    def L(s,p,q,col=C,ls='-',lw=1.5): s.ax.plot([p[0],q[0]],[p[1],q[1]],color=col,ls=ls,lw=lw)
    def T(s,x,y,t,fs=8,c=R,ha='center'): s.ax.text(x,y,t,fontsize=fs,ha=ha,va='center',color=c)
    def arc(s,c,r,a1,a2,ls='-',col=C,lw=1.5,fill=False):
        t=np.radians(np.linspace(a1,a2,80)); xs=c[0]+r*np.cos(t); ys=c[1]+r*np.sin(t)
        s.ax.plot(xs,ys,color=col,ls=ls,lw=lw)
        if fill: s.ax.fill(xs,ys,color=FILL,alpha=0.8)
    def poly(s,pts,fc=FILL,ec=C,lw=1.5,ls='-'): s.ax.add_patch(Polygon(pts,closed=True,fc=fc,ec=ec,lw=lw,ls=ls))
    def save(s):
        s.ax.autoscale_view(); s.fig.savefig('figs/%s.png'%s.name,bbox_inches='tight',pad_inches=0.06); plt.close(s.fig)
def cone_hemi(name,r,h,rl='r',hl='h',circ=False):
    f=F(name); f.poly([(-r,0),(r,0),(0,h)]); f.arc((0,0),r,180,360,fill=True)
    f.L((-r,0),(r,0),ls='--',col='#777'); f.L((0,0),(0,h),ls=':',col='#777'); f.L((0,0),(r,0),col=R)
    f.T(r/2,-0.16*r,rl); f.T(-0.12*r,h/2,hl,ha='right')
    if circ: f.poly([(-r,-r),(r,-r),(r,h),(-r,h)],fc='none',ec='#888',ls='--',lw=1)
    f.save()
def top(name,r,h,rl='r',hl='h'):
    f=F(name); f.poly([(-r,0),(r,0),(0,-h)]); f.arc((0,0),r,0,180,fill=True)
    f.L((-r,0),(r,0),ls='--',col='#777'); f.T(r/2,0.12*r,rl); f.T(0.15*r,-h/2,hl,ha='left'); f.save()
def capsule(name,r,hc,rl='r',hl='h'):
    f=F(name); f.poly([(-r,0),(r,0),(r,hc),(-r,hc)]); f.arc((0,0),r,180,360,fill=True); f.arc((0,hc),r,0,180,fill=True)
    f.L((-r,0),(r,0),ls='--',col='#777'); f.L((-r,hc),(r,hc),ls='--',col='#777'); f.T(r/2,-0.18*r,rl); f.T(r+0.12*r,hc/2,hl,ha='left'); f.save()
def tent(name,r,hc,hk,rl='r',hcl='h',hkl='h'):
    f=F(name); f.poly([(-r,0),(r,0),(r,hc),(-r,hc)]); f.poly([(-r,hc),(r,hc),(0,hc+hk)])
    f.T(0,-0.12*hc,rl); f.T(r+0.1*r,hc/2,hcl,ha='left'); f.T(r+0.1*r,hc+hk/2,hkl,ha='left'); f.save()
def cavity(name,r,h,rl,hl):
    f=F(name); f.poly([(-r,0),(r,0),(r,h),(-r,h)]); f.poly([(-r,h),(r,h),(0,0)],fc='white',ec=R,ls='--',lw=1.2)
    f.T(r/2,-0.12*h,rl); f.T(r+0.1*r,h/2,hl,ha='left'); f.save()
def cube_hemi(name,a,r,al,rl):
    f=F(name); f.poly([(0,0),(a,0),(a,a),(0,a)]); f.arc((a/2,a),r,0,180,fill=True); f.T(a/2,-0.1*a,al); f.T(a/2,a+0.22*r,rl); f.save()
cone_hemi('cone_hemi',1.5,2.6,'r','h'); cone_hemi('cone_hemi2',2,2,'2 cm','2 cm'); cone_hemi('cone_hemi1',1,1,'1 cm','1 cm'); cone_hemi('cone_hemi3',3,3,'3 cm','3 cm')
cone_hemi('toy_circ',2,2,'2 cm','2 cm',circ=True)
top('top',1.75,3.25,'1.75','3.25'); top('toy_bs',3.5,12,'3.5 cm','12 cm')
capsule('cap_ba',7,16,'7','16 cm'); capsule('cap_gb',2.5,9,'2.5','9 mm'); capsule('cap_ib',3.5,12,'3.5','12 cm')
tent('tent_ga',12,10,5,'12 m','10 m','5 m'); tent('tent_fw',2,2.1,1.4,'2 m','2.1 m','2.8 m (slant)'); tent('cone_cyl',7.5,15,7.5,'7.5 cm','15 cm','7.5 cm')
cavity('cav_ca',0.7,2.4,'0.7','2.4 cm'); cavity('cav_ga',10,24,'10','24 cm')
cube_hemi('cube_hemi',7,3.5,'7 cm','d = 7 cm'); cube_hemi('cube_hemi2',5,2.1,'5 cm','d = 4.2 cm')
# cuboid from two cubes
f=F('cuboid'); f.poly([(0,0),(8,0),(8,4),(0,4)]); f.L((4,0),(4,4),ls='--',col='#777'); f.T(2,2,'4 cm'); f.T(6,2,'4 cm'); f.T(4,-0.5,'8 cm'); f.save()
# frustum
f=F('frustum'); f.poly([(-28,0),(28,0),(7,45),(-7,45)]); f.L((0,0),(0,45),ls='--',col='#777'); f.T(14,-4,'28 cm'); f.T(4,47,'7 cm',ha='left'); f.T(1.5,22,'45 cm',ha='left'); f.ax.set_ylim(-8,52); f.save()
# glass with hemispherical bump
f=F('glass'); r=2.5; f.poly([(-r,0),(r,0),(r,10),(-r,10)],fc='white'); f.arc((0,0),r,0,180,fill=True,col=R); f.T(0,5,'10 cm'); f.T(0,10.8,'d = 5 cm'); f.ax.set_ylim(-1,12); f.save()
# well + embankment (top view)
f=F('well',w=2.8,h=2.8); f.ax.add_patch(Circle((0,0),5.5,fc=FILL,ec=C)); f.ax.add_patch(Circle((0,0),1.5,fc='white',ec=R)); f.L((0,0),(1.5,0),col=R); f.L((1.5,0),(5.5,0)); f.T(0.9,0.5,'1.5'); f.T(3.6,0.5,'4 m'); f.T(0,-3,'embankment',c=C); f.T(0,-6.4,'top view'); f.ax.set_xlim(-6,6); f.ax.set_ylim(-7,6); f.save()
# vessel with cylindrical neck
f=F('vessel'); r=4.25; n=1; y0=math.sqrt(r*r-n*n); f.arc((0,0),r,0,360)
f.poly([(-n,y0),(n,y0),(n,y0+8),(-n,y0+8)],fc='white'); f.T(0,0,'d = 8.5 cm'); f.T(n+0.2,y0+4,'8 cm',ha='left'); f.T(0,y0+8.7,'d = 2 cm'); f.save()
# hollow sphere
f=F('hollow'); f.arc((0,0),4,0,360,fill=True); f.ax.add_patch(Circle((0,0),2,fc='white',ec=R)); f.L((0,0),(4,0),col=R); f.T(1,0.4,'2'); f.T(3,0.4,'4'); f.save()
# tank hemisphere
f=F('tank'); r=1.5; f.arc((0,0),r,180,360,fill=True); f.L((-r,0),(r,0)); f.T(0,0.25,'d = 3 m'); f.save()
# cylinder on hemisphere (GB MCQ)
f=F('cyl_on_hemi'); f.poly([(-1,0),(1,0),(1,2),(-1,2)]); f.arc((0,0),1,180,360,fill=True); f.T(0,1,'2 cm'); f.T(0,-1.35,'r = 1 cm'); f.save()
