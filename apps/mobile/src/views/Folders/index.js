import React, {useEffect, useState} from 'react';
import {
  ScrollView,
  View,
  Text,
  TouchableOpacity,
  Dimensions,
  Image,
  SafeAreaView,
  Platform,
  Modal,
  KeyboardAvoidingView,
} from 'react-native';
import NavigationService from '../../services/NavigationService';
import {
  COLOR_SCHEME,
  SIZE,
  br,
  ph,
  pv,
  opacity,
  FONT,
  WEIGHT,
  onThemeUpdate,
  clearThemeUpdateListener,
} from '../../common/common';
import Icon from 'react-native-vector-icons/Feather';
import {Reminder} from '../../components/Reminder';
import {ListItem} from '../../components/ListItem';
import {getElevation, h, w, timeSince} from '../../utils/utils';
import {FlatList, TextInput} from 'react-native-gesture-handler';
import {useForceUpdate} from '../ListsEditor';
import {AddNotebookDialog} from '../../components/AddNotebookDialog';
import {NotebookItem} from '../../components/NotebookItem';
import {Search} from '../../components/SearchInput';
import {db, DDS} from '../../../App';
import {Header} from '../../components/header';
import {AnimatedSafeAreaView} from '../Home';
import * as Animatable from 'react-native-animatable';
import {NavigationEvents} from 'react-navigation';
import {useAppContext} from '../../provider/useAppContext';
export const Folders = ({navigation}) => {
  const {colors} = useAppContext();

  const [addNotebook, setAddNotebook] = useState(false);
  const [notebooks, setNotebooks] = useState([]);
  const [hideHeader, setHideHeader] = useState(false);
  const [buttonHide, setButtonHide] = useState(false);
  const [margin, setMargin] = useState(180);
  const [numColumns, setNumColumns] = useState(1);

  const params = navigation.state.params;
  let offsetY = 0;
  let countUp = 0;
  let countDown = 0;
  let headerHeight = 0;
  let searchHeight = 0;
  let marginSet = false;

  const slideRight = {
    0: {
      transform: [{translateX: -4}],
    },
    0.5: {
      transform: [{translateX: 0}],
    },
    1: {
      transform: [{translateX: 4}],
    },
  };
  const slideLeft = {
    0: {
      transform: [{translateX: 4}],
    },
    0.5: {
      transform: [{translateX: 0}],
    },
    1: {
      transform: [{translateX: -4}],
    },
  };

  const setMarginTop = () => {
    return;
    if (headerHeight < 30 || searchHeight < 30) {
      return;
    }
    let toAdd = h * 0.06;
    if (marginSet) return;
    let a = headerHeight + searchHeight + toAdd;
    setMargin(a);
    headerHeight = 0;
    searchHeight = 0;
    marginSet = true;
  };

  useEffect(() => {
    setNotebooks(db.getNotebooks());
    console.log(db.getNotebooks());
  }, []);

  return (
    <AnimatedSafeAreaView
      transition="backgroundColor"
      duration={300}
      style={{
        height: '100%',
        backgroundColor: colors.bg,
      }}>
      <NavigationEvents
        onDidBlur={() => {
          marginSet = false;
        }}
      />
      <AddNotebookDialog
        visible={addNotebook}
        close={newNotes => {
          setAddNotebook(false);
          if (newNotes) {
            setNotebooks(db.getNotebooks());
          }
        }}
      />
      <KeyboardAvoidingView
        style={{
          height: '100%',
        }}>
        <Animatable.View
          transition="backgroundColor"
          duration={300}
          style={{
            position: 'absolute',
            backgroundColor: colors.bg,
            zIndex: 10,
            width: '100%',
          }}>
          <Header
            sendHeight={height => (headerHeight = height)}
            hide={hideHeader}
            menu={true}
            showSearch={() => {
              setHideHeader(false);
              countUp = 0;
              countDown = 0;
            }}
            colors={colors}
            heading={params.title}
            canGoBack={false}
          />
          {notebooks.length == 0 ? null : (
            <Search
              sendHeight={height => {
                searchHeight = height;
                console.log(searchHeight + '' + headerHeight);
                setMarginTop();
              }}
              placeholder="Search your notebook"
              hide={hideHeader}
            />
          )}
        </Animatable.View>

        <FlatList
          style={{
            width: '100%',
          }}
          onScroll={event => {
            y = event.nativeEvent.contentOffset.y;
            if (y < 30) setHideHeader(false);
            if (buttonHide) return;
            if (y > offsetY) {
              if (y - offsetY < 150 || countDown > 0) return;
              countDown = 1;
              countUp = 0;
              setHideHeader(true);
            } else {
              if (offsetY - y < 150 || countUp > 0) return;
              countDown = 0;
              countUp = 1;
              setHideHeader(false);
            }
            offsetY = y;
          }}
          ListHeaderComponent={
            <View
              style={{
                marginTop: Platform.OS == 'ios' ? 145 : 185,
              }}
            />
          }
          numColumns={numColumns}
          key={numColumns}
          ListEmptyComponent={
            <View
              style={{
                height: '80%',
                width: '100%',
                alignItems: 'center',
                alignSelf: 'center',
                justifyContent: 'center',
                opacity: 0.8,
              }}>
              <Animatable.View
                animation={slideRight}
                iterationCount="infinite"
                duration={3000}
                iterationDelay={0}
                direction="alternate"
                easing="ease-in"
                useNativeDriver={true}
                style={{
                  backgroundColor: colors.shade,
                  width: '50%',
                  padding: 5,
                  borderRadius: 5,
                  marginBottom: 10,
                }}>
                <View
                  style={{
                    width: '50%',
                    height: 15,
                    borderRadius: 100,
                    backgroundColor: colors.accent,
                    marginBottom: 8,
                  }}
                />
                <View
                  style={{
                    width: '70%',
                    height: 10,

                    marginBottom: 8,
                    flexDirection: 'row',
                  }}>
                  <View
                    style={{
                      width: '30%',
                      height: 10,
                      borderRadius: 5,
                      backgroundColor: colors.accent,
                      marginRight: 8,
                    }}
                  />
                  <View
                    style={{
                      width: '30%',
                      height: 10,
                      borderRadius: 5,
                      backgroundColor: colors.accent,
                      marginRight: 8,
                    }}
                  />
                  <View
                    style={{
                      width: '30%',
                      height: 10,
                      borderRadius: 5,
                      backgroundColor: colors.accent,
                      marginRight: 8,
                    }}
                  />
                </View>
                <View
                  style={{
                    flexDirection: 'row',
                  }}>
                  <View
                    style={{
                      width: '15%',
                      height: 8,
                      borderRadius: 5,
                      backgroundColor: colors.icon,
                      marginRight: '5%',
                    }}
                  />
                  <View
                    style={{
                      width: '15%',
                      height: 8,
                      borderRadius: 5,
                      backgroundColor: colors.icon,
                    }}
                  />
                </View>
              </Animatable.View>

              <Animatable.View
                animation={slideLeft}
                iterationCount="infinite"
                duration={3000}
                iterationDelay={0}
                direction="alternate"
                easing="ease-in"
                useNativeDriver={true}
                style={{
                  backgroundColor: colors.shade,
                  width: '50%',
                  padding: 5,
                  borderRadius: 5,
                  marginBottom: 10,
                }}>
                <View
                  style={{
                    width: '50%',
                    height: 15,
                    borderRadius: 100,
                    backgroundColor: colors.accent,
                    marginBottom: 8,
                  }}
                />
                <View
                  style={{
                    width: '70%',
                    height: 10,

                    marginBottom: 8,
                    flexDirection: 'row',
                  }}>
                  <View
                    style={{
                      width: '30%',
                      height: 10,
                      borderRadius: 5,
                      backgroundColor: colors.accent,
                      marginRight: 8,
                    }}
                  />
                  <View
                    style={{
                      width: '30%',
                      height: 10,
                      borderRadius: 5,
                      backgroundColor: colors.accent,
                      marginRight: 8,
                    }}
                  />
                  <View
                    style={{
                      width: '30%',
                      height: 10,
                      borderRadius: 5,
                      backgroundColor: colors.accent,
                      marginRight: 8,
                    }}
                  />
                </View>
                <View
                  style={{
                    flexDirection: 'row',
                  }}>
                  <View
                    style={{
                      width: '15%',
                      height: 8,
                      borderRadius: 5,
                      backgroundColor: colors.icon,
                      marginRight: '5%',
                    }}
                  />
                  <View
                    style={{
                      width: '15%',
                      height: 8,
                      borderRadius: 5,
                      backgroundColor: colors.icon,
                    }}
                  />
                </View>
              </Animatable.View>

              <Animatable.View
                animation={slideRight}
                iterationCount="infinite"
                duration={3000}
                iterationDelay={0}
                direction="alternate"
                easing="ease-in"
                useNativeDriver={true}
                style={{
                  backgroundColor: colors.shade,
                  width: '50%',
                  padding: 5,
                  borderRadius: 5,
                  marginBottom: 10,
                }}>
                <View
                  style={{
                    width: '50%',
                    height: 15,
                    borderRadius: 100,
                    backgroundColor: colors.accent,
                    marginBottom: 8,
                  }}
                />
                <View
                  style={{
                    width: '70%',
                    height: 10,

                    marginBottom: 8,
                    flexDirection: 'row',
                  }}>
                  <View
                    style={{
                      width: '30%',
                      height: 10,
                      borderRadius: 5,
                      backgroundColor: colors.accent,
                      marginRight: 8,
                    }}
                  />
                  <View
                    style={{
                      width: '30%',
                      height: 10,
                      borderRadius: 5,
                      backgroundColor: colors.accent,
                      marginRight: 8,
                    }}
                  />
                  <View
                    style={{
                      width: '30%',
                      height: 10,
                      borderRadius: 5,
                      backgroundColor: colors.accent,
                      marginRight: 8,
                    }}
                  />
                </View>
                <View
                  style={{
                    flexDirection: 'row',
                  }}>
                  <View
                    style={{
                      width: '15%',
                      height: 8,
                      borderRadius: 5,
                      backgroundColor: colors.icon,
                      marginRight: '5%',
                    }}
                  />
                  <View
                    style={{
                      width: '15%',
                      height: 8,
                      borderRadius: 5,
                      backgroundColor: colors.icon,
                    }}
                  />
                </View>
              </Animatable.View>

              <Text
                style={{
                  color: colors.icon,
                  fontSize: SIZE.md,
                  fontFamily: WEIGHT.regular,
                  marginTop: 20,
                }}>
                Notebooks you add will appear here
              </Text>
              <Text
                style={{
                  fontSize: SIZE.sm,
                  color: colors.icon,
                  marginTop: 20,
                }}>
                No Notebooks found
              </Text>
            </View>
          }
          contentContainerStyle={{
            width: '100%',
            alignSelf: 'center',
          }}
          ListFooterComponent={
            <View
              style={{
                height: 150,
                alignItems: 'center',
                justifyContent: 'center',
              }}>
              <Text
                style={{
                  color: colors.navbg,
                  fontSize: SIZE.sm,
                  fontFamily: WEIGHT.regular,
                }}>
                - End -
              </Text>
            </View>
          }
          data={notebooks}
          keyExtractor={(item, index) => item.dateCreated.toString()}
          renderItem={({item, index}) => (
            <NotebookItem
              hideMore={params.hideMore}
              isMove={params.isMove}
              noteToMove={params.note}
              item={item}
              numColumns={numColumns}
              refresh={() => setNotebooks(db.getNotebooks())}
              index={index}
              colors={colors}
            />
          )}
        />
        <TouchableOpacity
          activeOpacity={opacity}
          onPress={() => {
            setAddNotebook(true);
          }}
          style={{
            borderRadius: 5,
            width: '90%',
            marginHorizontal: '5%',
            paddingHorizontal: ph,

            paddingVertical: pv + 5,
            flexDirection: 'row',
            justifyContent: 'flex-start',
            alignItems: 'center',
            marginBottom: 15,
            backgroundColor: colors.accent,
          }}>
          <Icon name="plus" color="white" size={SIZE.lg} />
          <Text
            style={{
              fontSize: SIZE.md,
              fontFamily: WEIGHT.semibold,
              color: 'white',
            }}>
            {'  '} Create a new notebook
          </Text>
        </TouchableOpacity>
      </KeyboardAvoidingView>
    </AnimatedSafeAreaView>
  );
};

Folders.navigationOptions = {
  header: null,
};

export default Folders;
