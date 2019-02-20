export IMAGE_TAG=`python ci_scripts/get_version.py`
export AARCH=`uname -m`
docker build -f Dockerfile.xos-gui-builder -t cachengo/xos-gui-builder-$AARCH:$IMAGE_TAG .
docker push cachengo/xos-gui-builder-$AARCH:$IMAGE_TAG
docker build -t cachengo/xos-gui-$AARCH:$IMAGE_TAG .
docker push cachengo/xos-gui-$AARCH:$IMAGE_TAG
